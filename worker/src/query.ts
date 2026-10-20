/**
 * The query parameters each list route takes, and how a query string becomes a
 * `Query` or a 400 message.
 *
 * - Parameters HSDS doesn't define for the route (utm_source, cache-busters) are ignored.
 * - HSDS parameters this API doesn't support are a 400. `format=json` is the default, so it's allowed.
 * - Bad values and a parameter given twice are a 400.
 * - `per_page` over the maximum is capped; `page` past the end gives an empty page.
 */
export const PER_PAGE_DEFAULT = 50;
export const PER_PAGE_MAX = 1000;
export const SEARCH_MAX_LENGTH = 200;

/** The lists, each at /api/<name>. Also in wrangler.jsonc's run_worker_first (test/routes.test.ts checks). */
export const LIST_ROUTES = [
    'services',
    'organizations',
    'service_at_locations',
    'taxonomies',
    'taxonomy_terms',
] as const;

export type ListRoute = (typeof LIST_ROUTES)[number];

export function isListRoute(name: string): name is ListRoute {
    return (LIST_ROUTES as readonly string[]).includes(name);
}

const PAGING = ['search', 'page', 'per_page'];
const TERMS = ['taxonomy_term_id', 'taxonomy_id'];

/** Must match static_build/openapi.json (test/openapi.test.ts checks). */
export const SUPPORTED: Record<ListRoute, readonly string[]> = {
    services: [...PAGING, ...TERMS, 'organization_id'],
    organizations: [...PAGING, ...TERMS],
    service_at_locations: [...PAGING, ...TERMS, 'organization_id'],
    taxonomies: PAGING,
    taxonomy_terms: [...PAGING, 'taxonomy_id', 'parent_id', 'top_only'],
};

/** HSDS defines these for the route; this API doesn't support them. */
export const UNSUPPORTED: Record<ListRoute, readonly string[]> = {
    services: ['format', 'modified_after', 'minimal', 'full'],
    organizations: ['format', 'full_service', 'full'],
    service_at_locations: ['format', 'modified_after', 'full', 'postcode', 'proximity'],
    taxonomies: ['format'],
    taxonomy_terms: ['format'],
};

export interface Query {
    page: number;
    perPage: number;
    search?: string;
    organizationId?: string;
    taxonomyTermId?: string;
    taxonomyId?: string;
    parentId?: string;
    topOnly: boolean;
}

export type Parsed = { ok: true; query: Query } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_NUMBER = /^[1-9][0-9]{0,8}$/;
const ID_FIELDS: Record<string, 'organizationId' | 'taxonomyTermId' | 'taxonomyId' | 'parentId'> = {
    organization_id: 'organizationId',
    taxonomy_term_id: 'taxonomyTermId',
    taxonomy_id: 'taxonomyId',
    parent_id: 'parentId',
};

export function parseQuery(route: ListRoute, params: URLSearchParams): Parsed {
    const query: Query = { page: 1, perPage: PER_PAGE_DEFAULT, topOnly: false };
    const seen = new Set<string>();
    for (const [name, value] of params) {
        if (UNSUPPORTED[route].includes(name)) {
            if (name === 'format' && value === 'json') continue;
            return fail(
                `${name}${name === 'format' ? `=${value}` : ''} is not supported. ` +
                    'Supported parameters: /api/openapi.json. Everything at once: /api/download.json.',
            );
        }
        if (!SUPPORTED[route].includes(name)) continue;
        if (seen.has(name)) return fail(`${name} is given more than once.`);
        seen.add(name);

        if (name === 'page' || name === 'per_page') {
            if (!WHOLE_NUMBER.test(value)) return fail(`${name} must be a whole number, 1 or more.`);
            const number = Number(value);
            if (name === 'page') query.page = number;
            else query.perPage = Math.min(number, PER_PAGE_MAX);
        } else if (name in ID_FIELDS) {
            if (!UUID.test(value)) return fail(`${name} must be an id (a UUID).`);
            query[ID_FIELDS[name]] = value.toLowerCase();
        } else if (name === 'top_only') {
            if (value !== 'true' && value !== 'false') return fail('top_only must be true or false.');
            query.topOnly = value === 'true';
        } else if (name === 'search') {
            if (value.length > SEARCH_MAX_LENGTH) {
                return fail(`search must be ${SEARCH_MAX_LENGTH} characters or fewer.`);
            }
            if (value.trim()) query.search = value.trim();
        }
    }
    return { ok: true, query };
}

function fail(error: string): Parsed {
    return { ok: false, error };
}
