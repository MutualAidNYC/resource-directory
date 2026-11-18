import { useSyncExternalStore } from 'react';

/** The lists a detail page links back to. */
export type ListPath = '/services' | '/organizations';

const key = (list: ListPath) => `last-list:${list}`;

/**
 * Remember a list's URL with its search and filters (`/services?category=Food`), for this
 * tab only, so a detail page's back link returns to it. Stays in the browser.
 */
export function rememberListUrl(list: ListPath, url: string) {
    try {
        sessionStorage.setItem(key(list), url);
    } catch {
        // Storage blocked (private mode, settings): the back link goes to the plain list.
    }
}

function readListUrl(list: ListPath): string {
    try {
        const url = sessionStorage.getItem(key(list));
        if (url === list || url?.startsWith(`${list}?`)) return url;
    } catch {
        // Storage blocked: fall through.
    }
    return list;
}

const noSubscribe = () => () => {};

/**
 * The list's last URL in this tab, or the plain list. The static page renders the plain
 * list; the browser swaps in the remembered one after hydration.
 */
export function useListUrl(list: ListPath): string {
    return useSyncExternalStore(
        noSubscribe,
        () => readListUrl(list),
        () => list,
    );
}
