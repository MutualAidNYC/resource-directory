/**
 * The daily rebuild: the production Worker's Cron Trigger POSTs its own Workers Builds
 * deploy hook.
 *
 * When the rebuild can't start it throws an error, and Cloudflare lists that day's run as
 * failed in the Worker's list of Cron runs.
 */
export async function rebuild(hook: string | undefined, post: typeof fetch = fetch): Promise<void> {
    if (!hook) throw new Error('DEPLOY_HOOK_URL is not set: add it as a secret on the production Worker.');
    let response: Response;
    try {
        response = await post(hook, { method: 'POST' });
    } catch {
        // The fetch error may include the hook URL,  don't pass it on.
        throw new Error('The deploy hook request failed before a response.');
    }
    // 429: a build is already queued or the hook is rate-limited, so one will run anyway.
    if (!response.ok && response.status !== 429) {
        throw new Error(`The deploy hook answered ${response.status}.`);
    }
}
