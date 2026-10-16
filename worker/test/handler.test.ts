import { describe, expect, it } from 'vitest';

import { handle, type Api } from '../src/handler';
import { lists } from '../src/lists';
import { DATA, ID } from './fixture';

const FILES: Record<string, string> = {
    '/index.html': '<h1>Home</h1>',
    '/404.html': '<h1>Not found</h1>',
};

const api: Api = {
    lists: lists(DATA),
    info: DATA.info,
    assets: async (request) => {
        const body = FILES[new URL(request.url).pathname];
        return body
            ? new Response(body, { headers: { 'Content-Type': 'text/html' } })
            : new Response('missing', { status: 404 });
    },
};

function get(path: string, method = 'GET') {
    return handle(new Request(`https://example.org${path}`, { method }), api);
}

describe('handle', () => {
    it('answers /api and /api/ with the info and an absolute openapi_url', async () => {
        for (const path of ['/api', '/api/']) {
            const response = await get(path);
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                ...DATA.info,
                openapi_url: 'https://example.org/api/openapi.json',
            });
        }
    });

    it('answers a list with an HSDS Page, with or without a trailing slash', async () => {
        for (const path of ['/api/services?per_page=2', '/api/services/?per_page=2']) {
            const page = await (await get(path)).json();
            expect(page).toMatchObject({ total_items: 3, total_pages: 2, size: 2 });
        }
        const response = await get(`/api/services?organization_id=${ID.groupB}`);
        const filtered = (await response.json()) as { contents: { id: string }[] };
        expect(filtered.contents.map((s) => s.id)).toEqual([ID.legal]);
    });

    it('sets JSON, CORS, cache and noindex headers', async () => {
        const response = await get('/api/services');
        expect(Object.fromEntries(response.headers)).toMatchObject({
            'content-type': 'application/json; charset=utf-8',
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=300',
            'x-robots-tag': 'noindex',
        });
    });

    it('answers a bad query with a 400 and the reason', async () => {
        const response = await get('/api/services?modified_after=2026-01-01');
        expect(response.status).toBe(400);
        expect(response.headers.get('cache-control')).toBe('no-store');
        const body = (await response.json()) as { error: string };
        expect(body.error).toMatch(/^modified_after is not supported/);
    });

    it('answers other /api paths with a JSON 404', async () => {
        for (const path of ['/api/services/not-a-record', '/api/nothing']) {
            const response = await get(path);
            expect(response.status).toBe(404);
            expect(await response.json()).toHaveProperty('error');
        }
    });

    it('allows GET and HEAD only, and answers CORS preflights', async () => {
        const post = await get('/api/services', 'POST');
        expect(post.status).toBe(405);
        expect(post.headers.get('allow')).toBe('GET, HEAD');

        const head = await get('/api/services', 'HEAD');
        expect([head.status, await head.text()]).toEqual([200, '']);

        const preflight = await get('/api/services', 'OPTIONS');
        expect(preflight.status).toBe(204);
        expect(preflight.headers.get('access-control-allow-methods')).toBe('GET, HEAD');
    });

    it("serves the site's files, and its 404 page for a missing one", async () => {
        expect(await (await get('/index.html')).text()).toBe('<h1>Home</h1>');
        const missing = await get('/no-such-page');
        expect([missing.status, await missing.text()]).toEqual([404, '<h1>Not found</h1>']);
    });
});
