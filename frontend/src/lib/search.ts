/**
 * Search, shared by the resources page, the groups page and, later, the API Worker.
 * On the site it runs in the browser; there's no search API.
 *
 * `search(records, query, fields)` returns the records that match every word of
 * the query, best matches first. Each word scores the weight of the best field it
 * matches; ties keep the records' own order. Words match at the start of a word,
 * so "hous" finds "housing" and "aid" doesn't find "said".
 *
 * Text is normalized the same way on both sides: lowercase, accents removed
 * ("café" → "cafe"), apostrophes dropped ("women's" → "womens"), other punctuation
 * treated as a space. No stemming or synonyms yet; if added, they belong here,
 * so pages and the Worker don't change.
 */
import type { MapService, Organization } from './types';

export interface SearchField<T> {
    /** The field's text; a list is searched as one text. */
    get: (record: T) => string | readonly string[] | undefined | null;
    weight: number;
}

/** Resources (the map data): name, then categories and group, then places, then description. */
export const SERVICE_FIELDS: readonly SearchField<MapService>[] = [
    { get: (s) => s.name, weight: 4 },
    { get: (s) => [...s.needFocus, ...s.communityFocus], weight: 3 },
    { get: (s) => s.organization_name, weight: 3 },
    { get: (s) => s.address, weight: 2 },
    { get: (s) => s.service_areas, weight: 2 },
    { get: (s) => s.description, weight: 1 },
];

/** Groups: name, then description. */
export const ORGANIZATION_FIELDS: readonly SearchField<Organization>[] = [
    { get: (o) => o.name, weight: 4 },
    { get: (o) => o.description, weight: 1 },
];

/** Words too common to narrow a search. */
const STOP_WORDS = new Set([
    'in', 'the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'at', 'on', 'near', 'by', 'with',
]);

/** Lowercase, no accents, apostrophes dropped, other punctuation as spaces. */
export function normalize(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/** The query's words, normalized, without stop words. */
export function queryWords(query: string): string[] {
    return normalize(query)
        .split(' ')
        .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

export function search<T extends object>(
    records: readonly T[],
    query: string,
    fields: readonly SearchField<T>[],
): T[] {
    const words = queryWords(query);
    if (words.length === 0) return [...records];

    const scored: { record: T; score: number; index: number }[] = [];
    records.forEach((record, index) => {
        const texts = fieldTexts(record, fields);
        let score = 0;
        for (const word of words) {
            let best = 0;
            for (let i = 0; i < fields.length; i++) {
                // Texts start with a space, so " word" is a match at the start of a word.
                if (fields[i].weight > best && texts[i].includes(` ${word}`)) best = fields[i].weight;
            }
            if (best === 0) return; // every word must match
            score += best;
        }
        scored.push({ record, score, index });
    });
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    return scored.map((s) => s.record);
}

// Normalized field texts per record, per field list: the records don't change
// while someone types, so each is normalized once.
const textCache = new WeakMap<readonly SearchField<never>[], WeakMap<object, string[]>>();

function fieldTexts<T extends object>(record: T, fields: readonly SearchField<T>[]): string[] {
    let byRecord = textCache.get(fields);
    if (!byRecord) {
        byRecord = new WeakMap();
        textCache.set(fields, byRecord);
    }
    let texts = byRecord.get(record);
    if (!texts) {
        texts = fields.map((f) => {
            const value = f.get(record);
            const text = typeof value === 'string' ? value : (value ?? []).join(' ');
            return ` ${normalize(text)}`;
        });
        byRecord.set(record, texts);
    }
    return texts;
}
