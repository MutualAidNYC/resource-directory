/**
 * The Cloudflare Worker entry: passes each request to handle() with the data and static
 * files, and runs the production Worker's Cron Triggers: the daily rebuild and the hourly
 * check.
 */
import raw from 'worker-data';

import { type AlertsEnv, check, HOURLY_CHECK } from './alerts';
import { handle } from './handler';
import { lists } from './lists';
import { DAILY_REBUILD, rebuild } from './rebuild';
import type { WorkerData } from './types';

interface Env extends AlertsEnv {
    ASSETS: Fetcher;
    /** Production only: when this version was deployed, for the hourly check. */
    CF_VERSION_METADATA: WorkerVersionMetadata;
    /** Production only: the Workers Builds deploy hook (a secret). */
    DEPLOY_HOOK_URL?: string;
}

const data = raw as WorkerData;
const api = lists(data);

export default {
    fetch: (request, env) =>
        handle(request, { lists: api, info: data.info, assets: (r) => env.ASSETS.fetch(r) }),
    scheduled: (controller, env) => {
        if (controller.cron === DAILY_REBUILD) return rebuild(env.DEPLOY_HOOK_URL);
        if (controller.cron === HOURLY_CHECK) {
            return check(env, controller.scheduledTime, env.CF_VERSION_METADATA.timestamp);
        }
        throw new Error(`No job for the Cron Trigger "${controller.cron}".`);
    },
} satisfies ExportedHandler<Env>;
