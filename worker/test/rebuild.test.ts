import { describe, expect, it } from 'vitest';

import { rebuild } from '../src/rebuild';

const HOOK = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/secret-id';

function answering(status: number) {
    const calls: [string, RequestInit | undefined][] = [];
    const post = (async (url: string, init?: RequestInit) => {
        calls.push([url, init]);
        return new Response(null, { status });
    }) as typeof fetch;
    return { post, calls };
}

describe('rebuild', () => {
    it('POSTs the deploy hook', async () => {
        const { post, calls } = answering(200);
        await rebuild(HOOK, post);
        expect(calls).toEqual([[HOOK, { method: 'POST' }]]);
    });

    it('treats 429 as success: a build will run anyway', async () => {
        await expect(rebuild(HOOK, answering(429).post)).resolves.toBeUndefined();
    });

    it('throws on other errors without the hook URL', async () => {
        const error = await rebuild(HOOK, answering(500).post).catch((e: Error) => e);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('500');
        expect((error as Error).message).not.toContain('secret-id');
    });

    it('throws when the request fails, without the hook URL', async () => {
        const post = (async () => {
            throw new TypeError(`fetch failed: ${HOOK}`);
        }) as typeof fetch;
        const error = await rebuild(HOOK, post).catch((e: Error) => e);
        expect((error as Error).message).not.toContain('secret-id');
    });

    it('throws when the secret is missing', async () => {
        await expect(rebuild(undefined, answering(200).post)).rejects.toThrow('DEPLOY_HOOK_URL');
    });
});
