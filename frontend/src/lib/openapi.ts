/**
 * The API's OpenAPI description, read when the site builds, for the API docs page
 * (`app/api-docs/`). Server-only, like data.ts.
 *
 * Read from `static_build/openapi.json` (the source of `/api/openapi.json`), so a
 * branch's preview shows that branch's description.
 *
 * Handles only what the description uses: GET operations; parameters inline or
 * from `#/components/parameters`; responses that are one HSDS record (a `$ref` to
 * an HSDS schema), a page of them (`allOf` with `#/components/schemas/Page`), or
 * an inline object. Anything else fails the build, so the page never leaves an
 * endpoint out.
 */
import fs from 'node:fs';
import path from 'node:path';

interface Schema {
    type?: string;
    format?: string;
    description?: string;
    default?: unknown;
    properties?: Record<string, Schema>;
    items?: Schema;
    allOf?: Schema[];
    $ref?: string;
}

interface Parameter {
    name: string;
    in: 'path' | 'query';
    required?: boolean;
    description?: string;
    schema?: Schema;
}

type ParameterOrRef = Parameter | { $ref: string };

interface Operation {
    summary?: string;
    parameters?: ParameterOrRef[];
    responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
}

interface OpenApi {
    info: { title: string };
    servers?: { url: string }[];
    paths: Record<string, { parameters?: ParameterOrRef[]; get?: Operation }>;
    components: { schemas: Record<string, Schema>; parameters: Record<string, Parameter> };
}

/** A field of a JSON object, with its own fields if it's an object. */
export interface Field {
    name: string;
    type: string;
    description?: string;
    fields?: Field[];
}

export interface Param {
    name: string;
    in: 'path' | 'query';
    type: string;
    required: boolean;
    default?: string;
    description?: string;
}

/** What a 200 response holds: HSDS records (one, or a page of them) or an object. */
export type Returns =
    | { kind: 'hsds'; list: boolean; schema: string; url: string }
    | { kind: 'object'; fields: Field[] };

export interface Endpoint {
    /** The section's id on the page, from the path: `services-id`. */
    anchor: string;
    /** The full path: `/api/services/{id}`. */
    path: string;
    summary: string;
    params: Param[];
    returns: Returns;
    /** A request to try, for endpoints without path parameters. */
    example?: string;
}

export interface ApiDocs {
    title: string;
    endpoints: Endpoint[];
    /** The fields of every list page (`#/components/schemas/Page`). */
    pageFields: Field[];
}

const PAGE_REF = '#/components/schemas/Page';
const PARAMETER_REF = '#/components/parameters/';

export function apiDocs(): ApiDocs {
    const file = path.resolve(process.cwd(), '../static_build/openapi.json');
    const spec = JSON.parse(fs.readFileSync(file, 'utf8')) as OpenApi;
    const base = spec.servers?.[0]?.url ?? '';

    const endpoints = Object.entries(spec.paths).map(([route, item]): Endpoint => {
        const op = item.get;
        if (!op) throw new Error(`openapi.json: ${route} has no GET operation.`);
        const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p) =>
            toParam(resolveParameter(spec, p)),
        );
        const schema = op.responses['200']?.content?.['application/json']?.schema;
        if (!schema) throw new Error(`openapi.json: ${route} has no 200 JSON response.`);
        const returns = toReturns(schema, route);
        const fullPath = route === '/' ? base : base + route;
        const hasPathParams = params.some((p) => p.in === 'path');
        const isList = returns.kind === 'hsds' && returns.list;
        return {
            anchor: route.replace(/[{}]/g, '').split('/').filter(Boolean).join('-') || 'info',
            path: fullPath,
            summary: op.summary ?? '',
            params,
            returns,
            example: hasPathParams ? undefined : isList ? `${fullPath}?per_page=2` : fullPath,
        };
    });

    return {
        title: spec.info.title,
        endpoints,
        pageFields: toFields(spec.components.schemas.Page),
    };
}

function resolveParameter(spec: OpenApi, p: ParameterOrRef): Parameter {
    if (!('$ref' in p)) return p;
    const found = p.$ref.startsWith(PARAMETER_REF)
        ? spec.components.parameters[p.$ref.slice(PARAMETER_REF.length)]
        : undefined;
    if (!found) throw new Error(`openapi.json: can't resolve parameter ${p.$ref}.`);
    return found;
}

function toParam(p: Parameter): Param {
    return {
        name: p.name,
        in: p.in,
        type: typeName(p.schema),
        required: p.required ?? false,
        default: p.schema?.default === undefined ? undefined : String(p.schema.default),
        description: p.description,
    };
}

function toReturns(schema: Schema, route: string): Returns {
    if (schema.$ref) return hsds(schema.$ref, false, route);
    if (schema.allOf?.some((s) => s.$ref === PAGE_REF)) {
        const items = schema.allOf.find((s) => s.properties?.contents)?.properties?.contents.items;
        if (items?.$ref) return hsds(items.$ref, true, route);
    }
    if (schema.properties) return { kind: 'object', fields: toFields(schema) };
    throw new Error(`openapi.json: ${route}'s response isn't an HSDS record, a page of them or an object.`);
}

/** An HSDS schema `$ref`, linked to its page on GitHub instead of the raw file. */
function hsds(ref: string, list: boolean, route: string): Returns {
    const match = ref.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+\/([^/]+)\.json)$/);
    if (!match) throw new Error(`openapi.json: ${route} refers to ${ref}, not an HSDS schema.`);
    const [, repo, tag, file, name] = match;
    return { kind: 'hsds', list, schema: name, url: `https://github.com/${repo}/blob/${tag}/${file}` };
}

function toFields(schema: Schema): Field[] {
    return Object.entries(schema.properties ?? {}).map(([name, s]) => ({
        name,
        type: typeName(s),
        description: s.description,
        fields: s.properties ? toFields(s) : undefined,
    }));
}

function typeName(schema: Schema | undefined): string {
    if (!schema?.type) return '';
    if (schema.type === 'array') return `array of ${typeName(schema.items) || 'values'}`;
    return schema.format ? `${schema.type} (${schema.format})` : schema.type;
}
