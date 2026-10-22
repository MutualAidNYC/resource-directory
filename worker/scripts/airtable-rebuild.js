/**
 * Rebuild the site when a service's publish status changes. Not run from this repo:
 * paste it into an Airtable automation on the services table.
 *
 * - Trigger: "When a record is updated", watching only `status`.
 * - Action: "Run a script" with this code, and the production Worker's deploy hook URL
 *   added as a secret named DEPLOY_HOOK_URL (Secrets → Add existing secret).
 *
 * The production Worker's Cron Trigger rebuilds once a day too (src/rebuild.ts), so a
 * missed run here only delays a change.
 */
const hook = await input.secret('DEPLOY_HOOK_URL');
const response = await fetch(hook, { method: 'POST' });
// 429: a build is already queued or the hook is rate-limited, so one will run anyway.
if (!response.ok && response.status !== 429) {
    throw new Error(`The deploy hook answered ${response.status}.`);
}
