/**
 * The requests that reach code instead of a static file: `/api`, the five lists,
 * and anything with no file (a 404).
 *
 * - `/api` and `/api/`: the API info, with `openapi_url` from the request's origin.
 * - `/api/<list>`: an HSDS Page, or a 400 with `{"error": …}`.
 * - Other `/api/…`: a JSON 404. Elsewhere: the site's 404 page.
 * - GET and HEAD only (405 otherwise); OPTIONS answers CORS preflights.
 */
import type { Lists } from './lists';
import { isListRoute, parseQuery } from './query';
import type { ApiInfo } from './types';

export interface Api {
    lists: Lists;
    info: ApiInfo;
    /** The static-file server (env.ASSETS on Cloudflare). */
    assets: (request: Request) => Promise<Response>;
}

const METHODS = 'GET, HEAD';
// Until launch: keep the dev site out of search engines (also in _headers).
const NOINDEX = { 'X-Robots-Tag': 'noindex' };
const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function handle(request: Request, api: Api): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
        return site(request, url, api);
    }
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                ...CORS,
                ...NOINDEX,
                'Access-Control-Allow-Methods': METHODS,
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Max-Age': '86400',
            },
        });
    }
    const head = request.method === 'HEAD';
    if (request.method !== 'GET' && !head) {
        const error = `${request.method} is not supported: this API is read-only.`;
        return json({ error }, 405, head, { Allow: METHODS });
    }

    const name = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    if (name === '') {
        return json({ ...api.info, openapi_url: `${url.origin}/api/openapi.json` }, 200, head);
    }
    if (isListRoute(name)) {
        const parsed = parseQuery(name, url.searchParams);
        if (!parsed.ok) return json({ error: parsed.error }, 400, head);
        return json(api.lists[name](parsed.query), 200, head);
    }
    return json({ error: 'Not found. The API: /api/openapi.json.' }, 404, head);
}

/** A site page with no file: the static file if there is one, else the site's 404 page. */
async function site(request: Request, url: URL, api: Api): Promise<Response> {
    const response = await api.assets(request);
    if (response.status !== 404) return response;
    const page = await api.assets(new Request(new URL('/404.html', url)));
    return new Response(page.body, { status: 404, headers: page.headers });
}

function json(
    body: unknown,
    status: number,
    head: boolean,
    headers: Record<string, string> = {},
): Response {
    return new Response(head ? null : JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
            ...CORS,
            ...NOINDEX,
            ...headers,
        },
    });
}
