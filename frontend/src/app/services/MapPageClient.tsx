'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TagLink } from '@/components/ui/TagLink';
import { externalHref } from '@/lib/format';
import { search, SERVICE_FIELDS } from '@/lib/search';
import type { Category, MapService } from '@/lib/types';

/** Haversine distance in miles between two lat/lng points. */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MapPageClientProps {
    services: MapService[];
    needCategories: Category[];
    communityCategories: Category[];
    serviceAreas: string[];
}

/**
 * Client component for interactive map page with URL-synced filters.
 *
 * Reads initial filter state from URL query params (?category=, ?community=, ?area=)
 * and pushes URL updates when the user changes filters, enabling sharable
 * filtered views like /services?category=Housing.
 */
export default function MapPageClient({
    services,
    needCategories,
    communityCategories,
    serviceAreas
}: MapPageClientProps) {
    const searchParams = useSearchParams();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Initialize state from URL query params
    const [searchQuery, setSearchQuery] = useState<string>(
        searchParams.get('q') || ''
    );
    const [selectedNeed, setSelectedNeed] = useState<string>(
        searchParams.get('category') || ''
    );
    const [selectedCommunity, setSelectedCommunity] = useState<string>(
        searchParams.get('community') || ''
    );
    const [selectedArea, setSelectedArea] = useState<string>(
        searchParams.get('area') || ''
    );

    // Initialize user location from URL params (set by SearchBar location button)
    const initLat = searchParams.get('lat');
    const initLng = searchParams.get('lng');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
        (initLat && initLng) ? { lat: parseFloat(initLat), lng: parseFloat(initLng) } : null
    );
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);

    // Responsive state
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

    // Sync state when URL params change (e.g. header SearchBar navigation)
    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '');
        setSelectedNeed(searchParams.get('category') || '');
        setSelectedCommunity(searchParams.get('community') || '');
        setSelectedArea(searchParams.get('area') || '');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        if (lat && lng) {
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    }, [searchParams]);

    /**
     * Push filter state into the browser URL so that filtered views are
     * bookmarkable and sharable (e.g. /services?category=Housing&q=food&area=Brooklyn).
     * history.replaceState, not router.replace: the router would download the
     * page's data again on every change; Next still updates useSearchParams.
     */
    const syncUrl = useCallback((query: string, need: string, community: string, area: string) => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (need) params.set('category', need);
        if (community) params.set('community', community);
        if (area) params.set('area', area);
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `/services?${qs}` : '/services');
    }, []);

    // The list filters as you type and the URL is already up to date, so submitting
    // (Enter, or the phone keyboard's Search key) only closes the keyboard on touch
    // screens, so the results show. On a desktop, focus stays in the search box.
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (window.matchMedia('(pointer: coarse)').matches) searchInputRef.current?.blur();
    };

    // Handle need category change
    const handleNeedChange = (value: string) => {
        setSelectedNeed(value);
        syncUrl(searchQuery, value, selectedCommunity, selectedArea);
    };

    // Handle community focus change
    const handleCommunityChange = (value: string) => {
        setSelectedCommunity(value);
        syncUrl(searchQuery, selectedNeed, value, selectedArea);
    };

    // Handle service area change
    const handleAreaChange = (value: string) => {
        setSelectedArea(value);
        syncUrl(searchQuery, selectedNeed, selectedCommunity, value);
    };

    // Request browser geolocation
    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            return;
        }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationStatus('idle');
            },
            () => setLocationStatus('error'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleClearLocation = () => {
        setUserLocation(null);
        setLocationStatus('idle');
    };

    // Clear all filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedNeed('');
        setSelectedCommunity('');
        setSelectedArea('');
        setUserLocation(null);
        setLocationStatus('idle');
        syncUrl('', '', '', '');
    };

    // Dropdown filters first (pass/fail), then search (lib/search.ts): every word
    // must match, best matches first.
    const filteredServices = useMemo(() => {
        const filtered = services.filter(service =>
            (!selectedNeed || service.needFocus.includes(selectedNeed)) &&
            (!selectedCommunity || service.communityFocus.includes(selectedCommunity)) &&
            (!selectedArea || service.service_areas.includes(selectedArea))
        );
        const results = search(filtered, searchQuery, SERVICE_FIELDS);

        // With a location, nearest first; the sort is stable, so ties keep the search order.
        if (userLocation) {
            const distance = (s: MapService) => (s.latitude && s.longitude)
                ? haversineDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude)
                : Infinity;
            results.sort((a, b) => distance(a) - distance(b));
        }
        return results;
    }, [services, searchQuery, selectedNeed, selectedCommunity, selectedArea, userLocation]);

    // Get locations for map
    const mapLocations = useMemo(() => {
        const locations = filteredServices
            .filter(s => s.latitude && s.longitude)
            .map(s => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude!,
                longitude: s.longitude!,
                serviceName: s.name,
                serviceId: s.id,
                orgName: s.organization_name,
            }));
            
        // Add jitter for overlapping coordinates (exact matches)
        const locationMap = new Map<string, number>();
        const jitterDegrees = 0.00005; // ~5 meters
        
        return locations.map(loc => {
            const key = `${loc.latitude},${loc.longitude}`;
            const count = locationMap.get(key) || 0;
            locationMap.set(key, count + 1);
            
            if (count > 0) {
                // Apply a spiral or simple offset based on index to separate them visually
                const angle = count * Math.PI / 4; // Spread them around
                const radius = jitterDegrees * Math.ceil(count / 8);
                return {
                    ...loc,
                    latitude: loc.latitude + Math.sin(angle) * radius,
                    longitude: loc.longitude + Math.cos(angle) * radius,
                };
            }
            return loc;
        });
    }, [filteredServices]);

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
            {/* Mobile Action Bar */}
            <div className="md:hidden flex items-center justify-between p-3 bg-[var(--section-alt)] border-b border-[var(--card-border)] flex-shrink-0 z-10 w-full shadow-sm">
                <button 
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium text-[var(--foreground)]"
                >
                    <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {isFiltersOpen ? 'Hide Filters' : 'Filters'}
                    {(searchQuery || selectedNeed || selectedCommunity || selectedArea) && (
                        <span className="w-2 h-2 rounded-full bg-[var(--highlight)] flex-shrink-0"></span>
                    )}
                </button>

                <div className="flex items-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-0.5">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'map' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        Map
                    </button>
                </div>
            </div>

            {/* Left Column: Filters */}
            <div className={`${isFiltersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0 bg-[var(--section-alt)] md:border-r border-b md:border-b-0 border-[var(--card-border)] p-4 overflow-y-auto scrollbar-thin`}>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    Filters
                </h2>

                {/* Search Input */}
                <div className="mb-6">
                    <label htmlFor="search-resources" className="block text-sm font-medium text-[var(--foreground)] opacity-80 mb-2">
                        Search
                    </label>
                    <form role="search" onSubmit={handleSearchSubmit}>
                        <input
                            ref={searchInputRef}
                            id="search-resources"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                syncUrl(e.target.value, selectedNeed, selectedCommunity, selectedArea);
                            }}
                            placeholder="Search resources..."
                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        />
                    </form>
                </div>

                {/* Use My Location */}
                <div className="mb-6">
                    {!userLocation ? (
                        <button
                            onClick={handleUseLocation}
                            disabled={locationStatus === 'loading'}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:bg-[var(--section-alt)] transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {locationStatus === 'loading' ? 'Locating...' : 'Use My Location'}
                        </button>
                    ) : (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--tag-olive-bg)] border border-[var(--secondary)]/30">
                            <span className="text-sm text-[var(--tag-olive-text)] font-medium">📍 Sorting by distance</span>
                            <button
                                onClick={handleClearLocation}
                                className="text-xs text-[var(--tag-olive-text)] hover:opacity-70"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    {locationStatus === 'error' && (
                        <p className="text-xs text-red-500 mt-1">Location access denied or unavailable.</p>
                    )}
                </div>

                {/* Need Category Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-need" className="block text-sm font-medium text-[var(--foreground)] opacity-80 mb-2">
                        Need Category
                    </label>
                    <select
                        id="filter-need"
                        value={selectedNeed}
                        onChange={(e) => handleNeedChange(e.target.value)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    >
                        <option value="">All Categories</option>
                        {needCategories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Community Focus Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-community" className="block text-sm font-medium text-[var(--foreground)] opacity-80 mb-2">
                        Community Focus
                    </label>
                    <select
                        id="filter-community"
                        value={selectedCommunity}
                        onChange={(e) => handleCommunityChange(e.target.value)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    >
                        <option value="">All Communities</option>
                        {communityCategories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Target Geographic Area Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-area" className="block text-sm font-medium text-[var(--foreground)] opacity-80 mb-2">
                        Target Geographic Area
                    </label>
                    <select
                        id="filter-area"
                        aria-describedby="filter-area-help"
                        value={selectedArea}
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    >
                        <option value="">All areas</option>
                        {serviceAreas.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <p id="filter-area-help" className="mt-1 text-xs text-[var(--foreground)] opacity-80">
                        Where a resource is offered, not where it is located.
                    </p>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedNeed || selectedCommunity || selectedArea) && (
                    <button
                        onClick={handleClearFilters}
                        className="btn btn-accent w-full"
                    >
                        Clear All Filters
                    </button>
                )}

                {/* Results count */}
                <div className="mt-4 text-sm text-[var(--foreground)]">
                    {filteredServices.length} resources found
                </div>
            </div>

            {/* Middle Column: Resource Cards */}
            <div className={`${viewMode === 'list' ? 'block' : 'hidden'} md:block w-full md:w-[32rem] flex-1 flex-shrink-0 border-r border-[var(--card-border)] overflow-y-auto scrollbar-thin`}>
                <div className="p-4 space-y-4">
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-8 text-[var(--foreground)]">
                            No resources match your filters
                        </div>
                    ) : (
                        filteredServices.map(service => (
                            <ResourceCard
                                key={service.id}
                                service={service}
                                userLocation={userLocation}
                                onViewOnMap={(id) => {
                                    setHoveredServiceId(id);
                                    setViewMode('map');
                                }}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Map */}
            <div className={`${viewMode === 'map' ? 'block' : 'hidden'} md:block flex-1 relative h-full min-w-0 p-2 md:p-2`}>
                <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-[var(--card-border)]">
                    <MapViewDynamic locations={mapLocations} highlightedId={hoveredServiceId} />
                </div>
            </div>
        </div>
    );
}

/**
 * Resource card component
 */
function ResourceCard({ service, userLocation, onViewOnMap }: {
    service: MapService;
    userLocation: { lat: number; lng: number } | null;
    onViewOnMap: (id: string) => void;
}) {
    const distance = (userLocation && service.latitude && service.longitude)
        ? haversineDistance(userLocation.lat, userLocation.lng, service.latitude, service.longitude)
        : null;
    const website = externalHref(service.url);

    return (
        <div
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4"
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-2">
                    {service.name}
                </h3>
                {distance !== null && (
                    <span className="flex-shrink-0 text-xs font-medium text-[var(--secondary)] bg-[var(--tag-blue-bg)] border border-[var(--tag-blue-text)] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {distance < 0.1 ? '< 0.1' : distance.toFixed(1)} mi
                    </span>
                )}
            </div>

            {service.address && (
                <div className="text-sm text-[var(--foreground)] mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" role="img" aria-label="address" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-2">{service.address}</span>
                    </div>
                    {/* Only offer the map view button when there is a pin with coordinates to jump to.
                        A location can have an address but no coordinates. */}
                    {service.latitude != null && service.longitude != null && (
                        <button
                            onClick={() => onViewOnMap(service.id)}
                            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--card-border)] bg-[var(--section-alt)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                        >
                            View on map
                        </button>
                    )}
                </div>
            )}

            {service.phone && (
                <p className="text-sm text-[var(--foreground)] mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" role="img" aria-label="phone" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${service.phone}`} className="underline hover:no-underline hover:text-[var(--primary)]">{service.phone}</a>
                </p>
            )}

            {website && (
                <p className="text-sm text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" role="img" aria-label="website" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline text-[var(--primary)] truncate"
                    >
                        {new URL(website).host}
                    </a>
                </p>
            )}

            {service.description && (
                <p className="text-sm text-[var(--foreground)] mb-3 line-clamp-2">
                    {service.description}
                </p>
            )}

            {/* Need Category tags */}
            {service.needFocus && service.needFocus.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {service.needFocus.map((need, i) => (
                        <TagLink
                            key={`need-${i}`}
                            colorScheme="coral"
                            size="sm"
                            href={`/services?category=${encodeURIComponent(need)}`}
                        >
                            {need}
                        </TagLink>
                    ))}
                </div>
            )}

            {/* Community Focus tags */}
            {service.communityFocus && service.communityFocus.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {service.communityFocus.map((community, i) => (
                        <TagLink
                            key={`community-${i}`}
                            colorScheme="olive"
                            size="sm"
                            href={`/services?community=${encodeURIComponent(community)}`}
                        >
                            {community}
                        </TagLink>
                    ))}
                </div>
            )}

            <Link
                href={`/services/${service.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] underline hover:no-underline"
            >
                More Details
                <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </Link>
        </div>
    );
}

/**
 * Dynamic map component (lazy loaded)
 */
import dynamic from 'next/dynamic';

const MapViewDynamic = dynamic(
    () => import('@/components/map/MapView'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-[var(--section-alt)] flex items-center justify-center">
                <div className="text-[var(--muted)]">Loading map...</div>
            </div>
        )
    }
);
