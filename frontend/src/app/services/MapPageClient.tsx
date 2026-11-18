'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { ServiceCard } from '@/components/services/ServiceCard';
import { search, SERVICE_FIELDS } from '@/lib/search';
import { useDebounced } from '@/lib/useDebounced';
import type { Category, MapService } from '@/lib/types';

// The filter labels and fields: square, like the theme's fields. 16px, so phones don't zoom.
const LABEL = 'block text-[15px] font-semibold mb-1.5';
const FIELD = 'w-full border border-muted bg-card-bg px-3 py-2 text-base';

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
    serviceAreas,
}: MapPageClientProps) {
    const searchParams = useSearchParams();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const filtersHeadingRef = useRef<HTMLHeadingElement>(null);

    // Initialize state from URL query params
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
    const [selectedNeed, setSelectedNeed] = useState<string>(searchParams.get('category') || '');
    const [selectedCommunity, setSelectedCommunity] = useState<string>(
        searchParams.get('community') || '',
    );
    const [selectedArea, setSelectedArea] = useState<string>(searchParams.get('area') || '');

    const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);

    // Responsive state
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

    // Sync state when URL params change (e.g. header SearchBar navigation). Done
    // while rendering, not in an effect, so the page never renders with stale filters
    const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
    if (searchParams !== prevSearchParams) {
        setPrevSearchParams(searchParams);
        setSearchQuery(searchParams.get('q') || '');
        setSelectedNeed(searchParams.get('category') || '');
        setSelectedCommunity(searchParams.get('community') || '');
        setSelectedArea(searchParams.get('area') || '');
    }

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

    // Clear all filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedNeed('');
        setSelectedCommunity('');
        setSelectedArea('');
        syncUrl('', '', '', '');
    };

    // Dropdown filters first (pass/fail), then search (lib/search.ts): every word
    // must match, best matches first.
    const filteredServices = useMemo(() => {
        const filtered = services.filter(
            (service) =>
                (!selectedNeed || service.needFocus.includes(selectedNeed)) &&
                (!selectedCommunity || service.communityFocus.includes(selectedCommunity)) &&
                (!selectedArea || service.service_areas.includes(selectedArea)),
        );
        return search(filtered, searchQuery, SERVICE_FIELDS);
    }, [services, searchQuery, selectedNeed, selectedCommunity, selectedArea]);

    // Get locations for map
    const mapLocations = useMemo(() => {
        const locations = filteredServices
            .filter((s) => s.latitude && s.longitude)
            .map((s) => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude!,
                longitude: s.longitude!,
                orgName: s.organization_name,
                href: `/services/${s.id}`,
            }));

        // Add jitter for overlapping coordinates (exact matches)
        const locationMap = new Map<string, number>();
        const jitterDegrees = 0.00005; // ~5 meters

        return locations.map((loc) => {
            const key = `${loc.latitude},${loc.longitude}`;
            const count = locationMap.get(key) || 0;
            locationMap.set(key, count + 1);

            if (count > 0) {
                // Apply a spiral or simple offset based on index to separate them visually
                const angle = (count * Math.PI) / 4; // Spread them around
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

    const filterIcon = (
        <svg
            className="w-4 h-4"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
        </svg>
    );
    // Shown in the Filters buttons as text ("Filters (2)"), so it doesn't rely on color.
    const activeFilterCount = [searchQuery, selectedNeed, selectedCommunity, selectedArea].filter(
        Boolean,
    ).length;
    const activeFilterText = activeFilterCount > 0 ? ` (${activeFilterCount})` : '';

    // Announced once typing stops, not after every key.
    const resultCount = useDebounced(filteredServices.length);

    // Jump up to the filters (instant: the page is long) and move focus to their heading.
    const openFiltersFromFloat = () => {
        setIsFiltersOpen(true);
        requestAnimationFrame(() => {
            const heading = filtersHeadingRef.current;
            heading?.scrollIntoView({ behavior: 'instant', block: 'start' });
            heading?.focus({ preventScroll: true });
        });
    };

    // Fills the screen with its own scroll areas when the screen is tall or wide. Only on
    // narrow, short screens (high zoom) does the whole page scroll instead (WCAG 1.4.10);
    // the floating Filters button below uses the same condition.
    return (
        <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)] md:overflow-hidden [@media(min-height:32rem)]:h-[calc(100vh-64px)] [@media(min-height:32rem)]:overflow-hidden">
            <h1 className="sr-only">Resources</h1>

            {/* Mobile Action Bar */}
            <div className="md:hidden flex items-center justify-between p-3 bg-section-alt border-b border-card-border flex-shrink-0 z-10 w-full shadow-sm">
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    aria-expanded={isFiltersOpen}
                    aria-controls="filters-panel"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg text-sm font-medium"
                >
                    {filterIcon}
                    {isFiltersOpen ? 'Hide Filters' : 'Filters'}
                    {activeFilterText}
                </button>

                <div className="flex items-center bg-card-bg rounded-lg border border-card-border p-0.5">
                    <button
                        onClick={() => setViewMode('list')}
                        aria-pressed={viewMode === 'list'}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
                    >
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        aria-pressed={viewMode === 'map'}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'map' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
                    >
                        Map
                    </button>
                </div>
            </div>

            {/* Short screens: the bar above scrolls away with the page, so a small Filters
                button floats at the bottom right. It opens the filters and moves focus there. */}
            <button
                onClick={openFiltersFromFloat}
                className="hidden [@media(width<48rem)_and_(height<32rem)]:flex fixed bottom-3 right-3 z-20 items-center gap-2 px-3 py-1.5 rounded-full border border-card-border bg-card-bg text-sm font-medium shadow-lg"
            >
                {filterIcon}
                Filters
                {activeFilterText}
            </button>

            {/* Left Column: Filters */}
            <div
                id="filters-panel"
                className={`${isFiltersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 min-h-0 md:flex-shrink-0 bg-section-alt md:border-r border-b md:border-b-0 border-card-border p-4 overflow-y-auto scrollbar-thin`}
            >
                <h2 ref={filtersHeadingRef} tabIndex={-1} className="text-lg/[1.4] mb-4">
                    Filters
                </h2>

                {/* Search Input */}
                <div className="mb-6">
                    <label htmlFor="search-resources" className={LABEL}>
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
                                syncUrl(
                                    e.target.value,
                                    selectedNeed,
                                    selectedCommunity,
                                    selectedArea,
                                );
                            }}
                            placeholder="Search resources..."
                            className={FIELD}
                        />
                    </form>
                </div>

                {/* Need Category Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-need" className={LABEL}>
                        Need Category
                    </label>
                    <select
                        id="filter-need"
                        value={selectedNeed}
                        onChange={(e) => handleNeedChange(e.target.value)}
                        className={FIELD}
                    >
                        <option value="">All Categories</option>
                        {needCategories.map((cat) => (
                            <option key={cat.name} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Community Focus Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-community" className={LABEL}>
                        Community Focus
                    </label>
                    <select
                        id="filter-community"
                        value={selectedCommunity}
                        onChange={(e) => handleCommunityChange(e.target.value)}
                        className={FIELD}
                    >
                        <option value="">All Communities</option>
                        {communityCategories.map((cat) => (
                            <option key={cat.name} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Geographic Area Filter */}
                <div className="mb-6">
                    <label htmlFor="filter-area" className={LABEL}>
                        Target Geographic Area
                    </label>
                    <select
                        id="filter-area"
                        aria-describedby="filter-area-help"
                        value={selectedArea}
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className={FIELD}
                    >
                        <option value="">All areas</option>
                        {serviceAreas.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                    <p id="filter-area-help" className="mt-1 text-xs opacity-80">
                        Where a resource is offered, not where it is located.
                    </p>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedNeed || selectedCommunity || selectedArea) && (
                    <button onClick={handleClearFilters} className="btn btn-accent w-full">
                        Clear All Filters
                    </button>
                )}
            </div>

            {/* Middle Column: Resource Cards */}
            <div
                className={`${viewMode === 'list' ? 'block' : 'hidden'} md:block w-full md:w-[32rem] flex-1 flex-shrink-0 border-r border-card-border overflow-y-auto scrollbar-thin`}
            >
                <div className="p-4 space-y-4">
                    <h2 className="sr-only">Results</h2>
                    <p role="status" className="text-sm">
                        {resultCount} {resultCount === 1 ? 'resource' : 'resources'} found
                    </p>
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-8">No resources match your filters</div>
                    ) : (
                        filteredServices.map((service) => (
                            <ServiceCard
                                key={service.id}
                                id={service.id}
                                name={service.name}
                                description={service.description}
                                url={service.url}
                                address={service.address}
                                organizationName={service.organization_name}
                                needFocus={service.needFocus}
                                communityFocus={service.communityFocus}
                                // Only with a pin to go to: a location can have an address but no coordinates.
                                onViewOnMap={
                                    service.latitude != null && service.longitude != null
                                        ? () => {
                                              setHoveredServiceId(service.id);
                                              setViewMode('map');
                                          }
                                        : undefined
                                }
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Map */}
            <div
                className={`${viewMode === 'map' ? 'block' : 'hidden'} md:block flex-1 relative h-full min-w-0 p-2`}
            >
                <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-card-border">
                    <MapContainer
                        locations={mapLocations}
                        highlightedId={hoveredServiceId}
                        showLocateButton
                    />
                </div>
            </div>
        </div>
    );
}
