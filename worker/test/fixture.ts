import type { WorkerData } from '../src/types';

/** Ids are UUIDs, as in the build's output. */
export const ID = {
    pantry: '00000000-0000-4000-8000-000000000001',
    fridge: '00000000-0000-4000-8000-000000000002',
    legal: '00000000-0000-4000-8000-000000000003',
    groupA: '00000000-0000-4000-8000-0000000000a1',
    groupB: '00000000-0000-4000-8000-0000000000a2',
    need: '00000000-0000-4000-8000-0000000000b1',
    community: '00000000-0000-4000-8000-0000000000b2',
    food: '00000000-0000-4000-8000-0000000000c1',
    legalHelp: '00000000-0000-4000-8000-0000000000c2',
    seniors: '00000000-0000-4000-8000-0000000000c3',
    salPantry: '00000000-0000-4000-8000-0000000000d1',
    salFridge: '00000000-0000-4000-8000-0000000000d2',
    hall: '00000000-0000-4000-8000-0000000000e1',
    corner: '00000000-0000-4000-8000-0000000000e2',
};

export const DATA: WorkerData = {
    info: { version: '3.3.1', publisher: { name: 'Mutual Aid NYC' } },
    services: [
        { id: ID.fridge, organization_id: ID.groupA, name: 'Community Fridge', status: 'active' },
        { id: ID.legal, organization_id: ID.groupB, name: 'Legal Clinic', status: 'active' },
        { id: ID.pantry, organization_id: ID.groupA, name: 'Pantry', status: 'active' },
    ],
    organizations: [
        { id: ID.groupA, name: 'Group A', description: 'Neighbors sharing food' },
        { id: ID.groupB, name: 'Group B', description: 'Tenant support' },
    ],
    service_at_locations: [
        { id: ID.salPantry, service_id: ID.pantry, location_id: ID.hall },
        { id: ID.salFridge, service_id: ID.fridge, location_id: ID.corner },
    ],
    taxonomies: [
        { id: ID.need, name: 'MANYC Need', description: 'Needs' },
        { id: ID.community, name: 'MANYC Community Focus', description: 'Who a resource is for' },
    ],
    taxonomy_terms: [
        { id: ID.food, name: 'Food', taxonomy_id: ID.need },
        { id: ID.legalHelp, name: 'Legal', taxonomy_id: ID.need },
        { id: ID.seniors, name: 'Seniors', taxonomy_id: ID.community },
    ],
    service_terms: {
        [ID.fridge]: [ID.food],
        [ID.legal]: [ID.legalHelp],
        [ID.pantry]: [ID.food, ID.seniors],
    },
    service_search: [
        // In the map's order, not the list's, as the build writes it.
        { id: ID.pantry, name: 'Pantry', description: 'Groceries every Friday', needFocus: ['Food'], communityFocus: ['Seniors'], organization_name: 'Group A', service_areas: ['Brooklyn'] },
        { id: ID.fridge, name: 'Community Fridge', needFocus: ['Food'], communityFocus: [], organization_name: 'Group A', service_areas: [] },
        { id: ID.legal, name: 'Legal Clinic', description: 'Help with housing court', needFocus: ['Legal'], communityFocus: [], organization_name: 'Group B', service_areas: ['Bronx'] },
    ],
};
