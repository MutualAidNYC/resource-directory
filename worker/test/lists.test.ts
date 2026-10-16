import { describe, expect, it } from 'vitest';

import { lists, paginate } from '../src/lists';
import { PER_PAGE_DEFAULT, type Query } from '../src/query';
import { DATA, ID } from './fixture';

const api = lists(DATA);

function q(overrides: Partial<Query> = {}): Query {
    return { page: 1, perPage: PER_PAGE_DEFAULT, topOnly: false, ...overrides };
}

const ids = (page: { contents: { id: string }[] }) => page.contents.map((r) => r.id);

describe('paginate', () => {
    it("is HSDS's Page", () => {
        expect(paginate(['a', 'b', 'c'], { page: 2, perPage: 2 })).toEqual({
            total_items: 3,
            total_pages: 2,
            page_number: 2,
            size: 1,
            first_page: false,
            last_page: true,
            empty: false,
            contents: ['c'],
        });
    });

    it('gives an empty last page past the end', () => {
        expect(paginate(['a'], { page: 5, perPage: 2 })).toMatchObject({
            size: 0,
            empty: true,
            last_page: true,
            contents: [],
        });
    });

    it('gives one empty page for an empty list', () => {
        expect(paginate([], { page: 1, perPage: 2 })).toMatchObject({ total_pages: 1, empty: true });
    });
});

describe('services', () => {
    it("lists every service in the build's order", () => {
        expect(ids(api.services(q()))).toEqual([ID.fridge, ID.legal, ID.pantry]);
    });

    it('filters by organization, term and taxonomy', () => {
        expect(ids(api.services(q({ organizationId: ID.groupA })))).toEqual([ID.fridge, ID.pantry]);
        expect(ids(api.services(q({ taxonomyTermId: ID.seniors })))).toEqual([ID.pantry]);
        expect(ids(api.services(q({ taxonomyId: ID.community })))).toEqual([ID.pantry]);
        const none = q({ taxonomyTermId: ID.food, organizationId: ID.groupB });
        expect(ids(api.services(none))).toEqual([]);
    });

    it("searches with the site's fields: best match first, ties in list order", () => {
        // "food" is a category of both: the same score, so list order.
        expect(ids(api.services(q({ search: 'food' })))).toEqual([ID.fridge, ID.pantry]);
        expect(ids(api.services(q({ search: 'housing' })))).toEqual([ID.legal]); // description
        expect(ids(api.services(q({ search: 'brooklyn' })))).toEqual([ID.pantry]); // service area
    });

    it('gives an empty list for a well-formed id that matches nothing', () => {
        const page = api.services(q({ taxonomyTermId: '00000000-0000-4000-8000-00000000ffff' }));
        expect(page).toMatchObject({ total_items: 0, empty: true, contents: [] });
    });
});

describe('organizations', () => {
    it('filter to groups with a matching service', () => {
        expect(ids(api.organizations(q({ taxonomyTermId: ID.legalHelp })))).toEqual([ID.groupB]);
        expect(ids(api.organizations(q({ taxonomyId: ID.need })))).toEqual([ID.groupA, ID.groupB]);
    });

    it('search name and description', () => {
        expect(ids(api.organizations(q({ search: 'tenant' })))).toEqual([ID.groupB]);
    });
});

describe('service_at_locations', () => {
    it('match and sort through their service', () => {
        expect(ids(api.service_at_locations(q()))).toEqual([ID.salPantry, ID.salFridge]);
        const seniors = api.service_at_locations(q({ taxonomyTermId: ID.seniors }));
        expect(ids(seniors)).toEqual([ID.salPantry]);
        // The fridge is first in the services list, so first among equal matches.
        const food = api.service_at_locations(q({ search: 'food' }));
        expect(ids(food)).toEqual([ID.salFridge, ID.salPantry]);
    });
});

describe('taxonomies and taxonomy_terms', () => {
    it('search by name', () => {
        expect(ids(api.taxonomies(q({ search: 'community' })))).toEqual([ID.community]);
        expect(ids(api.taxonomy_terms(q({ search: 'legal' })))).toEqual([ID.legalHelp]);
    });

    it('filter terms by taxonomy, parent and top_only', () => {
        expect(ids(api.taxonomy_terms(q({ taxonomyId: ID.community })))).toEqual([ID.seniors]);
        expect(ids(api.taxonomy_terms(q({ topOnly: true })))).toEqual([
            ID.food,
            ID.legalHelp,
            ID.seniors,
        ]);
        expect(ids(api.taxonomy_terms(q({ parentId: ID.food })))).toEqual([]);
    });
});
