'use client';

import { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { ServiceCard } from '@/components/services/ServiceCard';
import { CountLine } from '@/components/ui/CountLine';
import { Pagination, PerPage, paginate } from '@/components/ui/Pagination';
import { rememberOnDetailClick } from '@/lib/listUrl';
import { search, SERVICE_FIELDS } from '@/lib/search';
import type { Category, MapService } from '@/lib/types';
import { BAR, FRAME, PAGE, TEXT_BUTTON } from '@/lib/styles';

// The filter labels and fields: square, like the theme's fields. 16px, so phones don't zoom.
const LABEL = 'block text-[15px] font-semibold mb-1.5';
const FIELD = 'w-full border border-muted bg-card-bg px-3 py-2 text-base';

/** The URL's params, which are also the page's state: `/services?category=Food&view=map`. */
const KEYS = ['q', 'category', 'community', 'area', 'view', 'page', 'per'] as const;
type State = Record<(typeof KEYS)[number], string>;

const urlFor = (state: State) => {
    const params = new URLSearchParams();
    for (const k of KEYS) if (state[k]) params.set(k, state[k]);
    const qs = params.toString();
    return qs ? `/services?${qs}` : '/services';
};

/** The dropdowns, with the names their chips use. */
const FILTERS = [
    { key: 'category', label: 'Type of help' },
    { key: 'community', label: 'Community' },
    { key: 'area', label: 'Area' },
] as const;

const fromParams = (params: URLSearchParams) =>
    Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])) as State;

const resources = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'resource' : 'resources'}`;

interface MapPageClientProps {
    services: MapService[];
    needCategories: Category[];
    communityCategories: Category[];
    serviceAreas: string[];
}

/**
 * The resources list with search and filters, or the same results on a map (the Map
 * tab). Everything is in the URL (?q=, ?category=, ?community=, ?area=, ?view=map, and
 * the list's ?page= and ?per=), so a filtered list or map can be shared, and a back link
 * returns to the same page of results.
 */
export default function MapPageClient({
    services,
    needCategories,
    communityCategories,
    serviceAreas,
}: MapPageClientProps) {
    const searchParams = useSearchParams();
    const countRef = useRef<HTMLParagraphElement>(null);
    const chipsRef = useRef<HTMLDivElement>(null);
    const mapNoteRef = useRef<HTMLParagraphElement>(null);

    const [state, setState] = useState(() => fromParams(searchParams));
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Sync state when URL params change (e.g. header SearchBar navigation). Done
    // while rendering, not in an effect, so the page never renders with stale filters
    const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
    if (searchParams !== prevSearchParams) {
        setPrevSearchParams(searchParams);
        setState(fromParams(searchParams));
    }

    /**
     * Change the state and put it in the URL, so filtered views are bookmarkable and
     * sharable. history.replaceState, not router.replace: the router would download the
     * page's data again on every change; Next still updates useSearchParams. A new search,
     * filter or page size starts at page 1; switching List/Map keeps the page.
     */
    const update = (changes: Partial<State>) => {
        const keepPage = 'page' in changes || 'view' in changes;
        const next = { ...state, page: keepPage ? state.page : '', ...changes };
        setState(next);
        window.history.replaceState(null, '', urlFor(next));
    };

    const showView = (view: '' | 'map') => {
        setHighlightedId(null);
        update({ view });
    };

    // The list filters as you type and the URL is already up to date, so submitting
    // (Enter, or the phone keyboard's Search key) only closes the keyboard on touch
    // screens, so the results show. On a desktop, focus stays in the search box.
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (window.matchMedia('(pointer: coarse)').matches) {
            (document.activeElement as HTMLElement | null)?.blur();
        }
    };

    // A removed chip takes focus with it: once the page redraws, put it on the chip that
    // took its place (or the one before), so several can go in a row; on the count when
    // none are left.
    const clear = (changes: Partial<State>, chip = 0) => {
        update(changes);
        requestAnimationFrame(() => {
            const left = chipsRef.current?.querySelectorAll<HTMLElement>('[data-remove]') ?? [];
            (left[Math.min(chip, left.length - 1)] ?? countRef.current)?.focus();
        });
    };
    const clearAll = () => clear({ q: '', category: '', community: '', area: '' });

    // Dropdown filters first (pass/fail), then search (lib/search.ts): every word
    // must match, best matches first.
    const filteredServices = useMemo(() => {
        const filtered = services.filter(
            (service) =>
                (!state.category || service.needFocus.includes(state.category)) &&
                (!state.community || service.communityFocus.includes(state.community)) &&
                (!state.area || service.service_areas.includes(state.area)),
        );
        return search(filtered, state.q, SERVICE_FIELDS);
    }, [services, state.q, state.category, state.community, state.area]);

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

    const searched = state.q.trim();
    const applied = FILTERS.filter((f) => state[f.key]);
    const isMap = state.view === 'map';
    const total = filteredServices.length;
    const unmapped = total - mapLocations.length;
    // The list is paged; the map shows every result.
    const { shown, page, pageCount, range, perPage } = paginate(
        filteredServices,
        state.page,
        state.per,
    );

    const countText =
        !isMap && pageCount > 1
            ? `Showing ${range} of ${resources(total)}${searched ? ` for “${searched}”` : ''}`
            : `${resources(total)} ${searched ? `for “${searched}”` : 'found'}`;
    const countStatus =
        countText +
        (applied.length
            ? `, filtered by ${applied.map((f) => `${f.label}: ${state[f.key]}`).join(', ')}`
            : '');

    const searchInput = (id: string, className: string) => (
        <input
            id={id}
            type="text"
            value={state.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search resources"
            className={className}
        />
    );

    const select = (
        key: (typeof FILTERS)[number]['key'],
        label: string,
        all: string,
        options: string[],
        help?: string,
    ) => (
        <div className="mb-6 last:mb-0">
            <label htmlFor={`filter-${key}`} className={LABEL}>
                {label}
            </label>
            <select
                id={`filter-${key}`}
                aria-describedby={help ? `filter-${key}-help` : undefined}
                value={state[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                className={FIELD}
            >
                <option value="">{all}</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            {help && (
                <p id={`filter-${key}-help`} className="mt-1 text-sm text-muted">
                    {help}
                </p>
            )}
        </div>
    );

    return (
        <div
            className={`${PAGE} pt-10 pb-16`}
            // So "Back to all resources" on a resource opened from here returns to this
            // search and these filters (the cards and the map's popups).
            onClickCapture={rememberOnDetailClick('/services')}
        >
            <div className={`${BAR} mb-4`} />
            <h1 className="mb-6">Resources</h1>

            {/* Phones: search on its own, then the Filters button for the dropdowns. */}
            <div className="md:hidden mb-4 bg-section-alt p-3">
                <form role="search" onSubmit={handleSearchSubmit}>
                    <label htmlFor="search-resources-phone" className="sr-only">
                        Search resources
                    </label>
                    {searchInput(
                        'search-resources-phone',
                        'w-full rounded-full border border-muted bg-card-bg px-4 py-2.5 text-base',
                    )}
                </form>
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    aria-expanded={isFiltersOpen}
                    aria-controls="filters-panel"
                    className="mt-2.5 px-3.5 py-2 border border-muted bg-card-bg"
                >
                    {isFiltersOpen ? 'Hide filters' : 'Filters'}
                    {/* As text, so it doesn't rely on color. */}
                    {applied.length > 0 && ` (${applied.length})`}
                </button>
            </div>

            <div className="md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8 md:items-start">
                <div
                    id="filters-panel"
                    className={`${isFiltersOpen ? 'block' : 'hidden'} md:block mb-4 md:mb-0 bg-section-alt p-5 md:sticky md:top-4`}
                >
                    <h2 className="text-xl mb-4">Filters</h2>
                    <form
                        role="search"
                        onSubmit={handleSearchSubmit}
                        className="hidden md:block mb-6"
                    >
                        <label htmlFor="search-resources" className={LABEL}>
                            Search
                        </label>
                        {searchInput('search-resources', FIELD)}
                    </form>
                    {select(
                        'category',
                        'Type of help',
                        'All types',
                        needCategories.map((c) => c.name),
                    )}
                    {select(
                        'community',
                        'Community',
                        'All communities',
                        communityCategories.map((c) => c.name),
                    )}
                    {serviceAreas.length > 0 &&
                        select(
                            'area',
                            'Who it’s for (area)',
                            'All areas',
                            serviceAreas,
                            'Where a resource is offered, not where it is located.',
                        )}
                </div>

                <section aria-labelledby="results-heading" className="min-w-0">
                    <h2 id="results-heading" className="sr-only">
                        Results
                    </h2>
                    {/* The count, then Per page and List/Map, which wrap together; List/Map stays at the right. */}
                    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <CountLine ref={countRef} text={countText} status={countStatus} />
                        <div className="flex flex-auto flex-wrap items-center gap-x-6 gap-y-3">
                            {/* The map shows every result, so no page size there. */}
                            {!isMap && (
                                <PerPage
                                    total={total}
                                    per={perPage}
                                    onPer={(per) => update({ per })}
                                />
                            )}
                            <div
                                role="group"
                                aria-label="Show results as"
                                className="ml-auto flex border border-muted bg-card-bg"
                            >
                                {(['', 'map'] as const).map((view) => (
                                    <button
                                        key={view}
                                        onClick={() => showView(view)}
                                        aria-pressed={isMap === (view === 'map')}
                                        className={`px-4.5 py-2 font-semibold ${isMap === (view === 'map') ? 'bg-secondary text-white' : 'text-secondary'}`}
                                    >
                                        {view ? 'Map' : 'List'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {(applied.length > 0 || searched) && (
                        <div
                            ref={chipsRef}
                            role="group"
                            aria-label="Applied search and filters"
                            className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2"
                        >
                            {applied.map((f, i) => (
                                <Chip
                                    key={f.key}
                                    label={`${f.label}: ${state[f.key]}`}
                                    onRemove={() => clear({ [f.key]: '' }, i)}
                                />
                            ))}
                            {searched && (
                                <Chip
                                    label={`Search: “${searched}”`}
                                    onRemove={() => clear({ q: '' }, applied.length)}
                                />
                            )}
                            <button type="button" onClick={clearAll} className={TEXT_BUTTON}>
                                Clear all
                            </button>
                        </div>
                    )}

                    {isMap ? (
                        <>
                            <p ref={mapNoteRef} tabIndex={-1} className="mb-3">
                                Map showing {resources(mapLocations.length)}.
                                {unmapped > 0 &&
                                    ` ${unmapped.toLocaleString()} ${unmapped === 1 ? 'other has' : 'others have'} no address listed.`}
                            </p>
                            <div className={`h-[520px] md:h-[620px] ${FRAME}`}>
                                <MapContainer
                                    locations={mapLocations}
                                    highlightedId={highlightedId}
                                    showLocateButton
                                    onUseList={() => showView('')}
                                />
                            </div>
                        </>
                    ) : total > 0 ? (
                        <>
                            <ResourceGrid
                                services={shown}
                                onViewOnMap={(id) => {
                                    update({ view: 'map' });
                                    setHighlightedId(id);
                                    // The button is gone with the list: focus (and scroll) to the map's note.
                                    requestAnimationFrame(() => mapNoteRef.current?.focus());
                                }}
                            />
                            <Pagination
                                page={page}
                                pageCount={pageCount}
                                href={(page) => urlFor({ ...state, page, per: perPage })}
                                onPage={(page) => {
                                    update({ page, per: perPage });
                                    // The links are gone with the page: focus (and scroll) to "Showing x–y of n".
                                    requestAnimationFrame(() => countRef.current?.focus());
                                }}
                            />
                        </>
                    ) : (
                        <div className="py-10 text-center">
                            <p>Try fewer filters or a different word.</p>
                            <button
                                type="button"
                                onClick={clearAll}
                                className="btn btn-secondary mt-3"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

/** An applied filter or search, with a button that removes it. */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-card-bg py-px pr-px pl-3 text-[15px] font-semibold text-secondary">
            {label}
            <button
                type="button"
                data-remove
                onClick={onRemove}
                aria-label={`Remove ${label}`}
                className="w-7 h-7 rounded-full text-sm hover:bg-highlight-alt-border"
            >
                ✕
            </button>
        </span>
    );
}

interface ResourceGridProps {
    services: MapService[];
    /** Shows "View on map" on cards with a pin; left out before JavaScript runs. */
    onViewOnMap?: (id: string) => void;
}

/** The cards: two equal columns only when each card gets at least 20rem, otherwise one. */
export function ResourceGrid({ services, onViewOnMap }: ResourceGridProps) {
    return (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
            {services.map((service) => (
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
                        onViewOnMap && service.latitude != null && service.longitude != null
                            ? () => onViewOnMap(service.id)
                            : undefined
                    }
                />
            ))}
        </div>
    );
}
