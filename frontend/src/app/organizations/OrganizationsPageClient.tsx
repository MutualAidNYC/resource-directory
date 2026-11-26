'use client';

import { FormEvent, MouseEventHandler, Ref, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrganizationCard } from '@/components/organizations/OrganizationCard';
import { ORGANIZATION_FIELDS, search } from '@/lib/search';
import { CountLine } from '@/components/ui/CountLine';
import { Pagination, PerPage, paginate } from '@/components/ui/Pagination';
import { rememberOnDetailClick } from '@/lib/listUrl';
import type { OrganizationListItem } from '@/lib/types';
import { BAR, PAGE } from '@/lib/styles';

/** The URL's params, which are also the page's state: `/organizations?q=food&page=2`. */
const KEYS = ['q', 'page', 'per'] as const;
type State = Record<(typeof KEYS)[number], string>;

const fromParams = (params: URLSearchParams) =>
    Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])) as State;

/** The query goes in trimmed. */
const urlFor = (state: State) => {
    const params = new URLSearchParams();
    for (const k of KEYS) if (state[k].trim()) params.set(k, state[k].trim());
    const qs = params.toString();
    return qs ? `/organizations?${qs}` : '/organizations';
};

const groups = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'group' : 'groups'}`;

interface OrganizationsPageClientProps {
    organizations: OrganizationListItem[];
}

/**
 * The groups list with search. Filters as you type (lib/search.ts: name, then
 * description) and keeps the query and page in the URL (`?q=`, `?page=`, `?per=`), so a
 * search can be shared and a back link returns to the same page.
 */
export default function OrganizationsPageClient({ organizations }: OrganizationsPageClientProps) {
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const countRef = useRef<HTMLParagraphElement>(null);
    const [state, setState] = useState(() => fromParams(searchParams));

    // A link to the list (the sub-nav's "Groups") clears the search. Done while rendering,
    // not in an effect, so the page never renders with a stale query. Typing also changes
    // the URL, with the query trimmed: keep what's typed then, or a space would vanish.
    const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
    if (searchParams !== prevSearchParams) {
        setPrevSearchParams(searchParams);
        const next = fromParams(searchParams);
        if (next.q === state.q.trim()) next.q = state.q;
        setState(next);
    }

    const results = useMemo(
        () => search(organizations, state.q, ORGANIZATION_FIELDS),
        [organizations, state.q],
    );
    const searched = state.q.trim();
    const { shown, page, pageCount, range, perPage } = paginate(results, state.page, state.per);

    /**
     * Keep the state in the URL. `replaceState`, so typing doesn't add a history entry
     * per key, and not router.replace, which would download the page's data again. A new
     * search or page size starts at page 1.
     */
    const update = (changes: Partial<State>) => {
        const next = { ...state, page: '', ...changes };
        setState(next);
        window.history.replaceState(null, '', urlFor(next));
    };
    const updateQuery = (q: string) => update({ q });

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
            organizations={shown}
            searched={searched}
            count={`${pageCount > 1 ? `Showing ${range} of ` : ''}${groups(results.length)}${searched && ` for “${searched}”`}`}
            countRef={countRef}
            perPage={
                <PerPage total={results.length} per={perPage} onPer={(per) => update({ per })} />
            }
            pagination={
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
            }
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
                            value={state.q}
                            onChange={(e) => updateQuery(e.target.value)}
                            placeholder="Search groups"
                            className="w-full pl-11 pr-12 py-3 rounded-full border border-muted bg-card-bg text-lg"
                        />
                        {state.q && (
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
    /** The cards to show: this page of the results. */
    organizations: OrganizationListItem[];
    /** The trimmed search query, if any. */
    searched?: string;
    /** The count line; defaults to the number of cards. */
    count?: string;
    countRef?: Ref<HTMLParagraphElement>;
    /** The search box; left out while the page loads (no JavaScript yet). */
    searchBox?: React.ReactNode;
    /** Beside the count: how many a page. Left out while the page loads, like `pagination`. */
    perPage?: React.ReactNode;
    /** Below the cards: the page links. Left out while the page loads, so it shows all. */
    pagination?: React.ReactNode;
    onClickCapture?: MouseEventHandler;
}

/** Page header, optional search box and the grid of group cards. */
export function OrganizationGrid({
    organizations,
    searched = '',
    count = groups(organizations.length),
    countRef,
    searchBox,
    perPage,
    pagination,
    onClickCapture,
}: OrganizationGridProps) {
    const total = organizations.length;

    return (
        <div className={`${PAGE} pt-10 pb-16`} onClickCapture={onClickCapture}>
            <div className={`${BAR} mb-4`} />
            <h1 className="mb-6">Groups</h1>

            {searchBox && <div className="mb-6">{searchBox}</div>}

            {/* So the cards' h3s don't follow the h1 directly. */}
            <h2 className="sr-only">All groups</h2>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <CountLine ref={countRef} text={count} />
                {perPage}
            </div>

            {/* Groups Grid: equal columns, equal heights per row */}
            {total > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {organizations.map((org) => (
                            <OrganizationCard key={org.id} organization={org} />
                        ))}
                    </div>
                    {pagination}
                </>
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
