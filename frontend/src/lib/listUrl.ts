import { useSyncExternalStore, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';

/** The lists a detail page links back to. */
export type ListPath = '/services' | '/organizations';

const key = (list: ListPath) => `last-list:${list}`;

/**
 * A click handler for a list (use it as `onClickCapture`, so it runs before the link
 * navigates). When a link to one of the list's detail pages is clicked, it remembers the
 * list's URL with its search and filters, and that page, for this tab only. Stays in the
 * browser.
 */
export function rememberOnDetailClick(list: ListPath) {
    return (e: MouseEvent) => {
        const link = (e.target as Element).closest(`a[href^="${list}/"]`);
        if (!link) return;
        const saved = {
            url: window.location.pathname + window.location.search,
            detail: link.getAttribute('href'),
        };
        try {
            sessionStorage.setItem(key(list), JSON.stringify(saved));
        } catch {
            // Storage blocked (private mode, settings): the back link goes to the plain list.
        }
    };
}

function readListUrl(list: ListPath, pathname: string): string {
    try {
        const saved = JSON.parse(sessionStorage.getItem(key(list)) ?? 'null');
        const url = saved?.url;
        if (
            saved?.detail === pathname &&
            typeof url === 'string' &&
            (url === list || url.startsWith(`${list}?`))
        ) {
            return url;
        }
    } catch {
        // Storage blocked or unreadable: fall through.
    }
    return list;
}

const noSubscribe = () => () => {};

/**
 * Where this detail page's back link goes: the list it was opened from, with that list's
 * search and filters, or else the plain list. The static page renders the plain list; the
 * browser swaps in the remembered one after hydration.
 */
export function useListUrl(list: ListPath): string {
    const pathname = usePathname();
    return useSyncExternalStore(
        noSubscribe,
        () => readListUrl(list, pathname),
        () => list,
    );
}
