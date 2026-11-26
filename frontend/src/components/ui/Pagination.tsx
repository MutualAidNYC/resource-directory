'use client';

import { useId, type MouseEvent } from 'react';

/** The page sizes people can pick, besides "All". */
const SIZES = [24, 48, 96];
const DEFAULT_SIZE = 48;

/**
 * This page's slice of a list, from the URL's `page` and `per` (`24`, `48`, `96` or
 * `all`). Anything else falls back to page 1 and 48 a page, and a page past the end shows
 * the last one, so an old link never shows an empty list.
 */
export function paginate<T>(items: T[], page: string, per: string) {
    // The default (48) and anything unknown are '', so they stay out of the URL, like page 1.
    const perPage =
        per === 'all' || (per !== String(DEFAULT_SIZE) && SIZES.map(String).includes(per))
            ? per
            : '';
    const size = perPage === 'all' ? Math.max(items.length, 1) : Number(perPage) || DEFAULT_SIZE;
    const pageCount = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pageCount);
    const start = (current - 1) * size;
    const last = Math.min(start + size, items.length);
    return {
        shown: items.slice(start, start + size),
        page: current,
        pageCount,
        /** `per` cleaned up for the URL and the Per page dropdown: '24', '96', 'all' or '' (48). */
        perPage,
        /** For "Showing 49–96 of …", or "Showing 337 of …" when it's one. */
        range: last === start + 1 ? `${last}` : `${start + 1}–${last}`,
    };
}

/** 1 … 4 5 6 … 12: the first and last page, and the pages next to this one. 0 is a gap. */
function pageItems(page: number, pageCount: number) {
    const items: number[] = [];
    for (let n = 1; n <= pageCount; n++) {
        if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) items.push(n);
        else if (items.at(-1) !== 0) items.push(0);
    }
    return items;
}

interface PerPageProps {
    /** All results, before paging: no choice to make when they fit on the smallest page. */
    total: number;
    /** The page size, from `paginate`'s `perPage`. */
    per: string;
    onPer: (per: string) => void;
}

/**
 * How many to show a page, beside the count. Above the cards, so it stays put when the
 * list grows or shrinks, and focus stays on it.
 */
export function PerPage({ total, per, onPer }: PerPageProps) {
    const selectId = useId();
    if (total <= SIZES[0]) return null;
    return (
        <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="font-semibold">
                Per page
            </label>
            <select
                id={selectId}
                value={per}
                onChange={(e) => onPer(e.target.value)}
                className="border border-muted bg-card-bg px-3 py-2 text-base"
            >
                {SIZES.map((size) => (
                    <option key={size} value={size === DEFAULT_SIZE ? '' : size}>
                        {size}
                    </option>
                ))}
                <option value="all">All</option>
            </select>
        </div>
    );
}

interface PaginationProps {
    page: number;
    pageCount: number;
    /**
     * A page's URL, so a link also opens in a new tab. `page` is the URL's value: '' for
     * page 1, which stays out of the URL, else '2', '3' and so on. Same for `onPage`.
     */
    href: (page: string) => string;
    onPage: (page: string) => void;
}

const pageParam = (page: number) => (page > 1 ? String(page) : '');

const BOX = 'inline-flex min-w-10 h-10 items-center justify-center px-3 border font-semibold';

/**
 * Below a list: Previous · 1 … 4 5 6 … 12 · Next. The links are real links (a new tab
 * gets that page); a plain click changes the page here.
 */
export function Pagination({ page, pageCount, href, onPage }: PaginationProps) {
    if (pageCount <= 1) return null;

    /** A page number's link, or Previous/Next with `text`. */
    const link = (n: number, text?: string) => {
        const current = !text && n === page;
        return (
            <a
                href={href(pageParam(n))}
                aria-current={current ? 'page' : undefined}
                onClick={(e: MouseEvent) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onPage(pageParam(n));
                }}
                className={`${BOX} ${
                    current
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-muted bg-card-bg text-secondary hover:bg-highlight-alt-border'
                }`}
            >
                {text ?? (
                    <>
                        <span className="sr-only">Page </span>
                        {n}
                    </>
                )}
            </a>
        );
    };

    return (
        <nav aria-label="Pages" className="mt-8">
            <ul className="flex flex-wrap items-center gap-1.5">
                {page > 1 && <li>{link(page - 1, 'Previous')}</li>}
                {pageItems(page, pageCount).map((n, i) => (
                    <li key={n || `gap-${i}`}>
                        {n ? link(n) : <span className="inline-block px-1 text-muted">…</span>}
                    </li>
                ))}
                {page < pageCount && <li>{link(page + 1, 'Next')}</li>}
            </ul>
        </nav>
    );
}
