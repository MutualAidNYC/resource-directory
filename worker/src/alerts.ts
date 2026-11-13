/**
 * The hourly check, on the production Worker's Cron Trigger. Posts to Slack when:
 * - Runs of the Worker failed in the past hour (requests or Cron runs). The counts come
 *   from Cloudflare's analytics, which sample, so they're estimates.
 * - The Worker hasn't been deployed for over a day: the daily rebuild isn't landing, so the
 *   data may be out of date. Repeats once a day until a deploy.
 */

export interface AlertsEnv {
    /** A Slack incoming webhook URL (a secret). */
    ALERTS_WEBHOOK_URL?: string;
    /** An API token with Account Analytics: Read (a secret). */
    ANALYTICS_API_TOKEN?: string;
    /** The Cloudflare account ID (a secret, to keep it out of the repo). */
    ACCOUNT_ID?: string;
}

/** Its Cron Trigger in wrangler.jsonc: every hour at :17. */
export const HOURLY_CHECK = '17 * * * *';
export const SCRIPT_NAME = 'resource-directory';

const HOUR = 3_600_000;
/** Analytics arrive a few minutes late, so each check covers the hour ending 5 minutes ago. */
const LAG = 5 * 60_000;
/** The daily rebuild deploys by about 10:15 UTC; a version older than this missed it. */
export const STALE_AFTER = 26 * HOUR;
/** Statuses that aren't failures: `clientDisconnected` means the visitor left first. */
const NOT_FAILURES = new Set(['success', 'clientDisconnected']);

const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const QUERY = `query Failures($accountTag: string, $scriptName: string, $start: string, $end: string) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        limit: 100
        filter: { scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end }
      ) {
        sum { requests }
        dimensions { status }
      }
    }
  }
}`;

interface Row {
    sum: { requests: number };
    dimensions: { status: string };
}

interface GraphQLResponse {
    data?: { viewer?: { accounts?: { workersInvocationsAdaptive?: Row[] }[] } };
    errors?: { message: string }[] | null;
}

export async function check(
    env: AlertsEnv,
    now: number,
    deployedAt: string,
    post: typeof fetch = fetch,
): Promise<void> {
    const webhook = env.ALERTS_WEBHOOK_URL;
    if (!webhook) throw new Error('ALERTS_WEBHOOK_URL is not set: add it as a secret on the production Worker.');

    const lines: string[] = [];
    const stale = staleness(deployedAt, now);
    if (stale) lines.push(stale);

    try {
        const failed = await failures(env, now, post);
        if (failed) lines.push(failed);
    } catch (error) {
        lines.push(`⚠️ The hourly check couldn't count errors: ${(error as Error).message}`);
    }

    if (lines.length > 0) await notify(webhook, lines.join('\n'), post);
}

/** A message when the deployed version is over a day old, once a day; otherwise null. */
export function staleness(deployedAt: string, now: number): string | null {
    const age = now - Date.parse(deployedAt);
    // Written as !(>=) so an unparseable timestamp (NaN age) is null, not an alert every hour.
    if (!(age >= STALE_AFTER) || (age - STALE_AFTER) % (24 * HOUR) >= HOUR) return null;
    return (
        `⚠️ ${SCRIPT_NAME} hasn't been deployed for ${Math.floor(age / HOUR)} hours, so the site's ` +
        `data may be out of date. Check the Worker's builds and its daily Cron run.`
    );
}

/** A message counting the past hour's failed runs by status, or null when there were none. */
export async function failures(env: AlertsEnv, now: number, post: typeof fetch = fetch): Promise<string | null> {
    if (!env.ANALYTICS_API_TOKEN || !env.ACCOUNT_ID) {
        throw new Error('ANALYTICS_API_TOKEN and ACCOUNT_ID must be set as secrets on the production Worker.');
    }
    const end = new Date(now - LAG);
    const start = new Date(end.getTime() - HOUR);

    // The URL is public and the token is in a header, so a fetch error can pass through as is.
    const response = await post(GRAPHQL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: QUERY,
            variables: {
                accountTag: env.ACCOUNT_ID,
                scriptName: SCRIPT_NAME,
                start: start.toISOString(),
                end: end.toISOString(),
            },
        }),
    });
    if (!response.ok) throw new Error(`the analytics API answered ${response.status}.`);

    const body = (await response.json()) as GraphQLResponse;
    if (body.errors?.length) throw new Error(`the analytics API returned an error: ${body.errors[0].message}`);
    const account = body.data?.viewer?.accounts?.[0];
    if (!account) throw new Error('the analytics API found no account with that ACCOUNT_ID.');

    const counts = new Map<string, number>();
    for (const row of account.workersInvocationsAdaptive ?? []) {
        const status = row.dimensions.status;
        if (NOT_FAILURES.has(status)) continue;
        counts.set(status, (counts.get(status) ?? 0) + row.sum.requests);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const byStatus = [...counts].map(([status, n]) => `${status} ${n}`).join(', ');
    const hour = `${end.toISOString().slice(11, 16)} UTC`;
    return (
        `⚠️ About ${total} failed run${total === 1 ? '' : 's'} of ${SCRIPT_NAME} in the hour to ${hour} ` +
        `(${byStatus}). Details in the Worker's Observability tab: ` +
        `https://dash.cloudflare.com/${env.ACCOUNT_ID}/workers/services/view/${SCRIPT_NAME}/production`
    );
}

async function notify(webhook: string, text: string, post: typeof fetch): Promise<void> {
    let response: Response;
    try {
        response = await post(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
    } catch {
        // The fetch error may include the webhook URL, so don't pass it on.
        throw new Error('The Slack webhook request failed before a response.');
    }
    if (!response.ok) throw new Error(`The Slack webhook answered ${response.status}.`);
}
