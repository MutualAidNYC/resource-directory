import { describe, expect, it } from 'vitest';

import { PER_PAGE_DEFAULT, PER_PAGE_MAX, parseQuery, type ListRoute } from '../src/query';
import { ID } from './fixture';

function parse(route: ListRoute, query: string) {
    return parseQuery(route, new URLSearchParams(query));
}

function error(route: ListRoute, query: string): string {
    const parsed = parse(route, query);
    if (parsed.ok) throw new Error(`expected a 400 for ${query}`);
    return parsed.error;
}

describe('parseQuery', () => {
    it('defaults to the first page', () => {
        expect(parse('services', '')).toEqual({
            ok: true,
            query: { page: 1, perPage: PER_PAGE_DEFAULT, topOnly: false },
        });
    });

    it('reads paging, filters and search', () => {
        const query =
            'page=2&per_page=10&search=+food+' +
            `&organization_id=${ID.groupA.toUpperCase()}&taxonomy_term_id=${ID.food}`;
        expect(parse('services', query)).toEqual({
            ok: true,
            query: {
                page: 2,
                perPage: 10,
                search: 'food',
                organizationId: ID.groupA,
                taxonomyTermId: ID.food,
                topOnly: false,
            },
        });
    });

    it('caps per_page', () => {
        expect(parse('services', 'per_page=5000')).toMatchObject({ query: { perPage: PER_PAGE_MAX } });
    });

    it('ignores parameters HSDS does not define for the route', () => {
        expect(parse('services', 'utm_source=x&_=123').ok).toBe(true);
        expect(parse('taxonomies', `organization_id=${ID.groupA}`).ok).toBe(true);
    });

    it('rejects HSDS parameters this API does not support', () => {
        expect(error('services', 'modified_after=2026-01-01')).toMatch(/^modified_after is not supported/);
        expect(error('organizations', 'full_service=true')).toMatch(/^full_service/);
        expect(error('service_at_locations', 'postcode=11201')).toMatch(/^postcode/);
        expect(error('services', 'format=ndjson')).toMatch(/^format=ndjson is not supported/);
        expect(parse('services', 'format=json').ok).toBe(true);
    });

    it('rejects bad values', () => {
        expect(error('services', 'page=0')).toMatch(/^page must be a whole number/);
        expect(error('services', 'page=1.5')).toMatch(/^page must be a whole number/);
        expect(error('services', 'per_page=abc')).toMatch(/^per_page must be a whole number/);
        expect(error('services', 'organization_id=123')).toMatch(/^organization_id must be an id/);
        expect(error('taxonomy_terms', 'top_only=yes')).toMatch(/^top_only must be true or false/);
        expect(error('services', `search=${'a'.repeat(201)}`)).toMatch(/^search must be/);
    });

    it('rejects a parameter given twice', () => {
        expect(error('services', 'page=1&page=2')).toMatch(/^page is given more than once/);
    });

    it('treats an empty search as no search', () => {
        expect(parse('services', 'search=+++')).toEqual({
            ok: true,
            query: { page: 1, perPage: PER_PAGE_DEFAULT, topOnly: false },
        });
    });
});
