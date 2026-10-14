/**
 * The shapes of the data the site is built from (see data.ts).
 *
 * HSDS records come from the build's full download (api/download.json). Fields
 * with no value are left out, never null.
 */

export interface Phone {
    id: string;
    number: string;
    extension?: string;
    type?: string;
    description?: string;
}

export interface Address {
    id: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    region?: string;
    country?: string;
    address_type?: string;
}

export interface Location {
    id: string;
    name?: string;
    location_type?: string;
    latitude?: number;
    longitude?: number;
    addresses?: Address[];
}

export interface ServiceAtLocation {
    id: string;
    service_id?: string;
    location_id?: string;
    location?: Location;
}

export interface Language {
    id: string;
    name?: string;
    code?: string;
}

export interface Attribute {
    id: string;
    link_id: string;
    link_entity: string;
    taxonomy_term_id: string;
}

export interface Service {
    id: string;
    /** Left out when the service's group isn't published. */
    organization_id?: string;
    name: string;
    status: string;
    description?: string;
    url?: string;
    email?: string;
    assured_date?: string;
    phones?: Phone[];
    languages?: Language[];
    service_at_locations?: ServiceAtLocation[];
    attributes?: Attribute[];
}

/** A service in a list: what the API's services list carries. */
export type ServiceSummary = Pick<
    Service,
    'id' | 'organization_id' | 'name' | 'status' | 'description' | 'url' | 'email'
>;

export interface Organization {
    id: string;
    name: string;
    description?: string;
    email?: string;
    website?: string;
    phones?: Phone[];
    locations?: Location[];
}

/** A group in the groups list, with its number of published resources (counted by the site). */
export interface OrganizationListItem extends Organization {
    service_count: number;
}

export interface Taxonomy {
    id: string;
    name: string;
    description?: string;
}

export interface TaxonomyTerm {
    id: string;
    name: string;
    description?: string;
    taxonomy?: string;
    taxonomy_id?: string;
}

/** api/download.json: every published record. */
export interface Download {
    hsds_version: string;
    built_at: string;
    services: Service[];
    organizations: Organization[];
    taxonomies: Taxonomy[];
    taxonomy_terms: TaxonomyTerm[];
}

/**
 * The site's own data (site-data/map.json, application_layer/map.py), not HSDS:
 * one entry per published service for the map, search and category chips.
 */
export interface MapService {
    id: string;
    name: string;
    description?: string;
    /** The pin's address; only set with a pin. */
    address?: string;
    phone?: string;
    url?: string;
    /** Category names, from the matched taxonomy terms. */
    needFocus: string[];
    communityFocus: string[];
    latitude?: number;
    longitude?: number;
    organization_name?: string;
    /** Who the resource is for, not where it is. */
    service_areas: string[];
}

export interface Category {
    name: string;
}

export interface MapData {
    services: MapService[];
    needCategories: Category[];
    communityCategories: Category[];
    serviceAreas: string[];
}
