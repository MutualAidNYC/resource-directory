'use client';

import { FormEvent, MouseEventHandler, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrganizationCard } from '@/components/organizations/OrganizationCard';
import { ORGANIZATION_FIELDS, search } from '@/lib/search';
import { useDebounced } from '@/lib/useDebounced';
import { rememberOnDetailClick } from '@/lib/listUrl';
import type { OrganizationListItem } from '@/lib/types';
import { BAR, PAGE } from '@/lib/styles';

interface OrganizationsPageClientProps {
    organizations: OrganizationListItem[];
}

/**
 * The groups list with search. Filters as you type (lib/search.ts: name, then
 * description) and keeps the query in `?q=`, so a search can be shared.
 */
export default function OrganizationsPageClient({ organizations }: OrganizationsPageClientProps) {
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState(searchParams.get('q') ?? '');

    // A link to the list (the sub-nav's "Groups") clears the search. Done while rendering,
    // not in an effect, so the page never renders with a stale query. Typing also changes
    // the URL, with the query trimmed: keep what's typed then, or a space would vanish.
    const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
    if (searchParams !== prevSearchParams) {
        setPrevSearchParams(searchParams);
        const q = searchParams.get('q') ?? '';
        if (q !== query.trim()) setQuery(q);
    }

    const results = useMemo(
        () => search(organizations, query, ORGANIZATION_FIELDS),
        [organizations, query],
    );
    const searched = query.trim();

    /**
     * Keep the query in the URL. `replaceState`, so typing doesn't add a history entry
     * per key, and not router.replace, which would download the page's data again.
     */
    const updateQuery = (value: string) => {
        setQuery(value);
        const q = value.trim();
        window.history.replaceState(
            null,
            '',
            q ? `/organizations?q=${encodeURIComponent(q)}` : '/organizations',
        );
    };

    /** Close the phone keyboard; on a desktop, focus stays in the search box. */
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (window.matchMedia('(pointer: coarse)').matches) inputRef.current?.blur();
    };

    const handleClear = () => {
        updateQuery('');
        inputRef.current?.focus();
    };

    return (
        <OrganizationGrid
            organizations={results}
            searched={searched}
            // So "Back to groups" on a group opened from here returns to this search.
            onClickCapture={rememberOnDetailClick('/organizations')}
            searchBox={
                // The list filters as you type, so submitting (Enter, or the phone keyboard's
                // Search key) only closes the keyboard on touch screens, so the results show.
                <form role="search" onSubmit={handleSubmit} className="w-full max-w-xl">
                    <label htmlFor="org-search" className="sr-only">
                        Search groups
                    </label>
                    <div className="relative flex items-center">
                        <svg
                            className="absolute left-4 w-5 h-5 text-muted"
                            aria-hidden="true"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            ref={inputRef}
                            id="org-search"
                            type="text"
                            value={query}
                            onChange={(e) => updateQuery(e.target.value)}
                            placeholder="Search groups"
                            className="w-full pl-11 pr-12 py-3 rounded-full border border-muted bg-card-bg text-lg"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-3 p-1.5 text-muted hover:text-foreground"
                                aria-label="Clear search"
                            >
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
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </form>
            }
        />
    );
}

interface OrganizationGridProps {
    organizations: OrganizationListItem[];
    /** The trimmed search query, if any. */
    searched?: string;
    /** The search box; left out while the page loads (no JavaScript yet). */
    searchBox?: React.ReactNode;
    onClickCapture?: MouseEventHandler;
}

/** Page header, optional search box and the grid of group cards. */
export function OrganizationGrid({
    organizations,
    searched = '',
    searchBox,
    onClickCapture,
}: OrganizationGridProps) {
    const total = organizations.length;
    // Announced once typing stops, not after every key.
    const status = useDebounced(
        `${total.toLocaleString()} ${total === 1 ? 'group' : 'groups'}${searched && ` for “${searched}”`}`,
    );

    return (
        <div className={`${PAGE} pt-10 pb-16`} onClickCapture={onClickCapture}>
            {/* Page Header */}
            <div className="mb-6">
                <div className={`${BAR} mb-4`} />
                <h1 className="mb-6">Groups</h1>
                <p role="status" className="font-header font-bold text-lg text-secondary">
                    {status}
                </p>
            </div>

            {searchBox && <div className="mb-6">{searchBox}</div>}

            {/* Groups Grid: equal columns, equal heights per row */}
            {total > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizations.map((org) => (
                        <OrganizationCard key={org.id} organization={org} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h3 className="mb-2">
                        {searched ? `No results for "${searched}"` : 'No groups found'}
                    </h3>
                    <p>
                        {searched
                            ? 'Try a different search term.'
                            : 'No groups are currently available.'}
                    </p>
                </div>
            )}
        </div>
    );
}
