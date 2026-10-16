/**
 * The five HSDS lists: filters, search and paging over worker-data/data.json.
 * Plain functions of the data and a `Query`, so they're tested without HTTP.
 *
 * Without a search, lists keep the build's order (services and organizations by
 * name). With one, best matches come first and ties keep that order. Services
 * are searched with the site's fields and weights (frontend/src/lib/search.ts),
 * so the API and the site find the same resources.
 */
import {
    ORGANIZATION_FIELDS,
    SERVICE_FIELDS,
    search,
    type SearchField,
} from '../../frontend/src/lib/search';
import type { Query } from './query';
import type {
    OrganizationItem,
    ServiceAtLocationItem,
    ServiceItem,
    TaxonomyItem,
    TaxonomyTermItem,
    WorkerData,
} from './types';

/** HSDS's `Page`, with `contents`. */
export interface Page<T> {
    total_items: number;
    total_pages: number;
    page_number: number;
    size: number;
    first_page: boolean;
    last_page: boolean;
    empty: boolean;
    contents: T[];
}

export interface Lists {
    services(query: Query): Page<ServiceItem>;
    organizations(query: Query): Page<OrganizationItem>;
    service_at_locations(query: Query): Page<ServiceAtLocationItem>;
    taxonomies(query: Query): Page<TaxonomyItem>;
    taxonomy_terms(query: Query): Page<TaxonomyTermItem>;
}

const NAME_FIELDS: readonly SearchField<{ name: string; description?: string }>[] = [
    { get: (r) => r.name, weight: 4 },
    { get: (r) => r.description, weight: 1 },
];

export function lists(data: WorkerData): Lists {
    const serviceById = new Map(data.services.map((s) => [s.id, s]));
    const taxonomyOfTerm = new Map(data.taxonomy_terms.map((t) => [t.id, t.taxonomy_id]));
    const searchById = new Map(data.service_search.map((s) => [s.id, s]));
    // In the services list's order, so search ties keep it.
    const searchRecords = data.services.flatMap((s) => searchById.get(s.id) ?? []);

    // Searching once normalizes and caches every record's text, so it happens when
    // the Worker starts, not in the first request.
    search(searchRecords, 'start', SERVICE_FIELDS);
    search(data.organizations, 'start', ORGANIZATION_FIELDS);
    search(data.taxonomies, 'start', NAME_FIELDS);
    search(data.taxonomy_terms, 'start', NAME_FIELDS);

    function serviceMatches(service: ServiceItem, query: Query): boolean {
        const terms = data.service_terms[service.id] ?? [];
        if (query.organizationId && service.organization_id !== query.organizationId) return false;
        if (query.taxonomyTermId && !terms.includes(query.taxonomyTermId)) return false;
        if (query.taxonomyId && !terms.some((t) => taxonomyOfTerm.get(t) === query.taxonomyId)) {
            return false;
        }
        return true;
    }

    /** The matching services, best search match first. */
    function matchingServices(query: Query): ServiceItem[] {
        const matches = data.services.filter((s) => serviceMatches(s, query));
        if (!query.search) return matches;
        const ids = new Set(matches.map((s) => s.id));
        return search(
            searchRecords.filter((s) => ids.has(s.id)),
            query.search,
            SERVICE_FIELDS,
        ).flatMap((s) => serviceById.get(s.id) ?? []);
    }

    return {
        services: (query) => paginate(matchingServices(query), query),

        organizations(query) {
            let organizations = data.organizations;
            if (query.taxonomyTermId || query.taxonomyId) {
                const services = matchingServices({ ...query, search: undefined });
                const ids = new Set(services.map((s) => s.organization_id));
                organizations = organizations.filter((o) => ids.has(o.id));
            }
            if (query.search) organizations = search(organizations, query.search, ORGANIZATION_FIELDS);
            return paginate(organizations, query);
        },

        service_at_locations(query) {
            // A service_at_location matches through its service, and sorts with it.
            const rank = new Map(matchingServices(query).map((s, i) => [s.id, i]));
            const matches = data.service_at_locations.filter((sal) => rank.has(sal.service_id));
            if (query.search) {
                matches.sort((a, b) => rank.get(a.service_id)! - rank.get(b.service_id)!);
            }
            return paginate(matches, query);
        },

        taxonomies(query) {
            const matches = query.search
                ? search(data.taxonomies, query.search, NAME_FIELDS)
                : data.taxonomies;
            return paginate(matches, query);
        },

        taxonomy_terms(query) {
            let terms = data.taxonomy_terms.filter(
                (t) =>
                    (!query.taxonomyId || t.taxonomy_id === query.taxonomyId) &&
                    (!query.parentId || t.parent_id === query.parentId) &&
                    (!query.topOnly || !t.parent_id),
            );
            if (query.search) terms = search(terms, query.search, NAME_FIELDS);
            return paginate(terms, query);
        },
    };
}

export function paginate<T>(items: readonly T[], query: Pick<Query, 'page' | 'perPage'>): Page<T> {
    const { page, perPage } = query;
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const contents = items.slice((page - 1) * perPage, page * perPage);
    return {
        total_items: items.length,
        total_pages: totalPages,
        page_number: page,
        size: contents.length,
        first_page: page === 1,
        last_page: page >= totalPages,
        empty: contents.length === 0,
        contents,
    };
}
