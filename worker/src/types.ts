/** The shape of worker-data/data.json (static_build/worker_data.py). */
import type { MapService } from '../../frontend/src/lib/types';

export interface ServiceItem {
    id: string;
    organization_id?: string;
    name: string;
    status: string;
    description?: string;
    url?: string;
    email?: string;
    assured_date?: string;
}

export interface OrganizationItem {
    id: string;
    name: string;
    description?: string;
    email?: string;
    website?: string;
}

export interface ServiceAtLocationItem {
    id: string;
    service_id: string;
    location_id: string;
}

export interface TaxonomyItem {
    id: string;
    name: string;
    description?: string;
}

export interface TaxonomyTermItem {
    id: string;
    name: string;
    description?: string;
    taxonomy_id?: string;
    parent_id?: string;
}

export interface ApiInfo {
    version: string;
    description?: string;
    publisher?: { name: string; website?: string };
}

export interface WorkerData {
    info: ApiInfo;
    services: ServiceItem[];
    organizations: OrganizationItem[];
    service_at_locations: ServiceAtLocationItem[];
    taxonomies: TaxonomyItem[];
    taxonomy_terms: TaxonomyTermItem[];
    /** Service id → its taxonomy term ids. */
    service_terms: Record<string, string[]>;
    /** Each service's search fields, from the site's map data. */
    service_search: MapService[];
}
