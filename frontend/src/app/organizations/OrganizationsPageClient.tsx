'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrganizationCard } from '@/components/organizations/OrganizationCard';
import { ORGANIZATION_FIELDS, search } from '@/lib/search';
import type { OrganizationListItem } from '@/lib/types';

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

    const results = useMemo(
        () => search(organizations, query, ORGANIZATION_FIELDS),
        [organizations, query]
    );
    const searched = query.trim();

    /**
     * Keep the query in the URL. `replaceState`, so typing doesn't add a history entry
     * per key, and not router.replace, which would download the page's data again.
     */
    const updateQuery = (value: string) => {
        setQuery(value);
        const q = value.trim();
        window.history.replaceState(null, '', q ? `/organizations?q=${encodeURIComponent(q)}` : '/organizations');
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
            searchBox={
                // The list filters as you type, so submitting (Enter, or the phone keyboard's
                // Search key) only closes the keyboard on touch screens, so the results show.
                <form role="search" onSubmit={handleSubmit} className="w-full max-w-xl">
                    <label htmlFor="org-search" className="sr-only">
                        Search groups
                    </label>
                    <div className="relative flex items-center">
                        <svg className="absolute left-3 w-5 h-5 text-[var(--muted)]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            id="org-search"
                            type="text"
                            value={query}
                            onChange={(e) => updateQuery(e.target.value)}
                            placeholder="Search groups..."
                            className="w-full pl-10 pr-12 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-2 p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                                aria-label="Clear search"
                            >
                                <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
}

/** Page header, optional search box and the grid of group cards. */
export function OrganizationGrid({ organizations, searched = '', searchBox }: OrganizationGridProps) {
    const total = organizations.length;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">
                    Groups
                </h1>
                <p className="text-[var(--foreground)]">
                    {total.toLocaleString()} {total === 1 ? 'group' : 'groups'} providing community resources{searched && ` for search term "${searched}"`}
                </p>
            </div>

            {searchBox && <div className="mb-8">{searchBox}</div>}

            {/* Groups Grid */}
            {total > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {organizations.map((org) => (
                        <OrganizationCard key={org.id} organization={org} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                        {searched ? `No results for "${searched}"` : "No groups found"}
                    </h3>
                    <p className="text-[var(--foreground)]">
                        {searched ? "Try a different search term." : "No groups are currently available."}
                    </p>
                </div>
            )}
        </div>
    );
}
