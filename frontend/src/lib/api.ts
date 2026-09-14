/**
 * HSDS API Client
 * 
 * Provides typed access to the ATtoOR HSDS 3.0 API endpoints.
 * All methods handle pagination and error states.
 */

/**
 * Resolve the correct API base URL.
 *
 * Server-side (SSR/RSC): prefer INTERNAL_API_URL when the backend is reachable
 * on a private network — http://api:8080 under Docker Compose — so rendering
 * does not route out through a public URL and back.
 *
 * Client-side: NEXT_PUBLIC_API_URL, since a browser can only use a public
 * address. No client component fetches today; this is the fallback if one does.
 */
const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

/**
 * Use the committed snapshot when there is no API deployed. Deployed builds
 * with no API configured pick it up automatically.
 * NEXT_PUBLIC_USE_SNAPSHOT=1 forces it on locally.
 */
const DEPLOYED = !!process.env.VERCEL || !!process.env.NEXT_PUBLIC_VERCEL_ENV;
const API_CONFIGURED = !!process.env.NEXT_PUBLIC_API_URL || !!process.env.INTERNAL_API_URL;
const USE_SNAPSHOT =
  process.env.NEXT_PUBLIC_USE_SNAPSHOT === '1' || (DEPLOYED && !API_CONFIGURED);

/**
 * HSDS Service type based on HSDS 3.0 specification
 */
export interface Service {
    id: string;
    name: string;
    description?: string;
    url?: string;
    email?: string;
    status?: string;
    organization_id?: string;
    organization?: Organization;
    service_at_locations?: ServiceAtLocation[];
    // Custom extension fields
    group_name?: string;
    need_focus?: string[];
    community_focus?: string[];
    phones?: Phone[];
}

/**
 * HSDS Phone type
 */
export interface Phone {
    id: string;
    number: string;
    extension?: string;
    type?: string;
    description?: string;
}

/**
 * HSDS Organization type
 */
export interface Organization {
    id: string;
    name: string;
    description?: string;
    url?: string;
    email?: string;
    logo?: string;
    service_count?: number;
    locations?: Location[];
}

/**
 * HSDS Location type
 */
export interface Location {
    id: string;
    name?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    addresses?: Address[];
}

/**
 * HSDS Address type
 */
export interface Address {
    id: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
}

/**
 * HSDS ServiceAtLocation linking type
 */
export interface ServiceAtLocation {
    id: string;
    service_id: string;
    location_id: string;
    location?: Location;
}

/**
 * HSDS Taxonomy Term type
 */
export interface TaxonomyTerm {
    id: string;
    name: string;
    description?: string;
    taxonomy_id?: string;
}

/**
 * Paginated response wrapper matching HSDS 3.0 format
 */
export interface PaginatedResponse<T> {
    total_items: number;
    total_pages: number;
    page_number: number;
    size: number;
    first_page: boolean;
    last_page: boolean;
    empty: boolean;
    contents: T[];
}

/**
 * API error type for consistent error handling
 */
export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string): Promise<T> {
    // Snapshot mode: no backend. Remove with the rest of the scaffolding when
    // we deploy the api backend.
    if (USE_SNAPSHOT) {
        const { resolveFromSnapshot, SnapshotMiss } = await import('./snapshot');
        try {
            return resolveFromSnapshot<T>(endpoint);
        } catch (e) {
            if (e instanceof SnapshotMiss) throw new ApiError(404, e.message);
            throw e;
        }
    }

    if (DEPLOYED && API_URL.includes('localhost')) {
        throw new ApiError(
            500,
            'Deployed build is pointed at localhost. Set NEXT_PUBLIC_API_URL to a reachable API, ' +
            'or unset it to serve from the committed snapshot.'
        );
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
        throw new ApiError(response.status, `API error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch paginated list of services, optionally filtered by search query.
 */
export async function getServices(page: number = 1, size: number = 20, search?: string): Promise<PaginatedResponse<Service>> {
    let url = `/services?page=${page}&per_page=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return fetchApi<PaginatedResponse<Service>>(url);
}

/**
 * Fetch a single service by ID with full details
 */
export async function getService(id: string): Promise<Service> {
    return fetchApi<Service>(`/services/${id}`);
}

/**
 * Fetch paginated list of organizations, with optional text search.
 */
export async function getOrganizations(page: number = 1, size: number = 20, search?: string): Promise<PaginatedResponse<Organization>> {
    let url = `/organizations?page=${page}&per_page=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return fetchApi<PaginatedResponse<Organization>>(url);
}

/**
 * Search organizations by name. Returns the first match or null.
 * Used to resolve group names to org profile links.
 */
export async function searchOrganizationByName(name: string): Promise<Organization | null> {
    try {
        const result = await fetchApi<PaginatedResponse<Organization>>(
            `/organizations?search=${encodeURIComponent(name)}&per_page=1`
        );
        return result.contents?.[0] ?? null;
    } catch {
        return null;
    }
}

/**
 * Fetch a single organization by ID
 */
export async function getOrganization(id: string): Promise<Organization> {
    return fetchApi<Organization>(`/organizations/${id}`);
}

/**
 * Fetch services for a specific organization
 */
export async function getOrganizationServices(
    organizationId: string,
    page: number = 1,
    size: number = 100
): Promise<PaginatedResponse<Service>> {
    return fetchApi<PaginatedResponse<Service>>(`/organizations/${organizationId}/services?page=${page}&per_page=${size}`);
}

/**
 * Fetch taxonomy terms for filtering
 */
export async function getTaxonomyTerms(): Promise<PaginatedResponse<TaxonomyTerm>> {
    return fetchApi<PaginatedResponse<TaxonomyTerm>>('/taxonomy_terms?per_page=100');
}

/**
 * Fetch service at locations for map display
 */
export async function getServiceAtLocations(page: number = 1, size: number = 100): Promise<PaginatedResponse<ServiceAtLocation>> {
    return fetchApi<PaginatedResponse<ServiceAtLocation>>(`/service_at_locations?page=${page}&per_page=${size}`);
}

/**
 * Service data for map display
 */
export interface MapService {
    id: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    url?: string;
    needFocus: string[];
    communityFocus: string[];
    latitude?: number;
    longitude?: number;
    service_areas?: string[];
}

export interface Category {
    name: string;
}

/**
 * Map data response with services and filter options
 */
export interface MapDataResponse {
    services: MapService[];
    needCategories: Category[];
    communityCategories: Category[];
    serviceAreas: string[];
}

/**
 * Fetch services data for map page with filter categories
 */
export async function getMapServices(): Promise<MapDataResponse> {
    return fetchApi<MapDataResponse>('/map/services');
}

