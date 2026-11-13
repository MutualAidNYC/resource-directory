import { describe, expect, it } from 'vitest';

import { check, failures, HOURLY_CHECK, SCRIPT_NAME, STALE_AFTER, staleness } from '../src/alerts';
import { DAILY_REBUILD } from '../src/rebuild';
import text from '../wrangler.jsonc?raw';

const HOUR = 3_600_000;
const WEBHOOK = 'https://hooks.slack.com/services/T000/B000/secret-webhook';
const ENV = { ALERTS_WEBHOOK_URL: WEBHOOK, ANALYTICS_API_TOKEN: 'secret-token', ACCOUNT_ID: 'acct' };
const NOW = Date.parse('2026-11-11T12:17:00Z');
const FRESH = '2026-11-11T10:12:00Z';

type Rows = { status: string; requests: number }[];

/** A fake fetch: answers the analytics API with `rows` (or `analytics`), Slack with 200. */
function fake(rows: Rows, analytics?: Response) {
    const slack: string[] = [];
    const graphql: unknown[] = [];
    const post = (async (url: string, init?: RequestInit) => {
        if (url === WEBHOOK) {
            slack.push(JSON.parse(String(init?.body)).text);
            return new Response('ok');
        }
        graphql.push(JSON.parse(String(init?.body)));
        if (analytics) return analytics;
        const invocations = rows.map((r) => ({ sum: { requests: r.requests }, dimensions: { status: r.status } }));
        return Response.json({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: invocations }] } } });
    }) as typeof fetch;
    return { post, slack, graphql };
}

describe('wrangler.jsonc', () => {
    const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));

    it('has a Cron Trigger for each job, and none on the preview Worker', () => {
        expect(config.triggers.crons).toEqual([DAILY_REBUILD, HOURLY_CHECK]);
        expect(config.env.preview.triggers.crons).toEqual([]);
    });

    it("names the Worker the hourly check asks about (a wrong name finds no failures)", () => {
        expect(config.name).toBe(SCRIPT_NAME);
    });
});

describe('failures', () => {
    it('asks for the hour ending 5 minutes ago', async () => {
        const { post, graphql } = fake([]);
        await failures(ENV, NOW, post);
        expect(graphql).toMatchObject([
            {
                variables: {
                    accountTag: 'acct',
                    scriptName: 'resource-directory',
                    start: '2026-11-11T11:12:00.000Z',
                    end: '2026-11-11T12:12:00.000Z',
                },
            },
        ]);
    });

    it('is null when every run succeeded or the visitor left', async () => {
        const { post } = fake([
            { status: 'success', requests: 120 },
            { status: 'clientDisconnected', requests: 3 },
        ]);
        expect(await failures(ENV, NOW, post)).toBeNull();
    });

    it('counts the other statuses', async () => {
        const { post } = fake([
            { status: 'success', requests: 120 },
            { status: 'scriptThrewException', requests: 2 },
            { status: 'exceededResources', requests: 1 },
        ]);
        const message = await failures(ENV, NOW, post);
        expect(message).toContain('About 3 failed runs');
        expect(message).toContain('scriptThrewException 2, exceededResources 1');
        expect(message).toContain('12:12 UTC');
    });

    it('throws without its secrets', async () => {
        await expect(failures({ ALERTS_WEBHOOK_URL: WEBHOOK }, NOW, fake([]).post)).rejects.toThrow(
            'ANALYTICS_API_TOKEN',
        );
    });

    it('throws on an API error, without the token', async () => {
        const error = await failures(ENV, NOW, fake([], new Response(null, { status: 403 })).post).catch(
            (e: Error) => e,
        );
        expect((error as Error).message).toContain('403');
        expect((error as Error).message).not.toContain('secret-token');
    });

    it('throws on a GraphQL error', async () => {
        const answer = Response.json({ data: null, errors: [{ message: 'not authorized' }] });
        await expect(failures(ENV, NOW, fake([], answer).post)).rejects.toThrow('not authorized');
    });

    it('throws when the account is not found', async () => {
        const answer = Response.json({ data: { viewer: { accounts: [] } } });
        await expect(failures(ENV, NOW, fake([], answer).post)).rejects.toThrow('ACCOUNT_ID');
    });
});

describe('staleness', () => {
    const deployed = Date.parse(FRESH);
    const at = (age: number) => staleness(FRESH, deployed + age);

    it('is null for a version deployed within the past day and a bit', () => {
        expect(at(STALE_AFTER - 1)).toBeNull();
    });

    it('reports once a day after that', () => {
        expect(at(STALE_AFTER)).toContain("hasn't been deployed for 26 hours");
        expect(at(STALE_AFTER + HOUR)).toBeNull();
        expect(at(STALE_AFTER + 23 * HOUR)).toBeNull();
        expect(at(STALE_AFTER + 24 * HOUR)).toContain('50 hours');
    });

    it('is null when the deploy time is missing or unreadable', () => {
        expect(staleness('', NOW)).toBeNull();
        expect(staleness('not a date', NOW)).toBeNull();
    });
});

describe('check', () => {
    it('posts nothing when all is well', async () => {
        const { post, slack } = fake([{ status: 'success', requests: 10 }]);
        await check(ENV, NOW, FRESH, post);
        expect(slack).toEqual([]);
    });

    it('posts failures and staleness in one message', async () => {
        const { post, slack } = fake([{ status: 'scriptThrewException', requests: 1 }]);
        await check(ENV, Date.parse(FRESH) + STALE_AFTER, FRESH, post);
        expect(slack).toHaveLength(1);
        expect(slack[0]).toContain('About 1 failed run ');
        expect(slack[0]).toContain("hasn't been deployed");
    });

    it("posts why it couldn't count errors, without throwing", async () => {
        const { post, slack } = fake([], new Response(null, { status: 403 }));
        await expect(check(ENV, NOW, FRESH, post)).resolves.toBeUndefined();
        expect(slack).toHaveLength(1);
        expect(slack[0]).toContain("couldn't count errors");
        expect(slack[0]).toContain('403');
    });

    it('throws without the webhook', async () => {
        await expect(check({}, NOW, FRESH, fake([]).post)).rejects.toThrow('ALERTS_WEBHOOK_URL');
    });

    it("throws when Slack fails, without the webhook URL", async () => {
        const post = (async (url: string) =>
            url === WEBHOOK ? new Response(null, { status: 404 }) : Response.json({})) as typeof fetch;
        const error = await check(ENV, Date.parse(FRESH) + STALE_AFTER, FRESH, post).catch((e: Error) => e);
        expect((error as Error).message).toContain('404');
        expect((error as Error).message).not.toContain('secret-webhook');
    });
});
