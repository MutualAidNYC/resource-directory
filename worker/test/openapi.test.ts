import { expect, it } from 'vitest';

import spec from '../../static_build/openapi.json';
import { SUPPORTED, type ListRoute } from '../src/query';

type Parameter = { name?: string; $ref?: string };

it('static_build/openapi.json lists exactly the parameters each list route accepts', () => {
    const components = spec.components.parameters as Record<string, { name: string }>;
    const paths = spec.paths as Record<string, { get: { parameters?: Parameter[] } }>;
    for (const [route, accepted] of Object.entries(SUPPORTED) as [ListRoute, readonly string[]][]) {
        const listed = (paths[`/${route}`].get.parameters ?? []).map(
            (p) => p.name ?? components[p.$ref!.split('/').pop()!].name,
        );
        expect([...listed].sort(), route).toEqual([...accepted].sort());
    }
});
