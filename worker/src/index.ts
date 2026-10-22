/**
 * The Cloudflare Worker entry: passes each request to handle() with the data and static
 * files, and runs the daily rebuild on the production Worker's Cron Trigger.
 */
import raw from 'worker-data';

import { handle } from './handler';
import { lists } from './lists';
import { rebuild } from './rebuild';
import type { WorkerData } from './types';

interface Env {
    ASSETS: Fetcher;
    /** Production only: the Workers Builds deploy hook (a secret). */
    DEPLOY_HOOK_URL?: string;
}

const data = raw as WorkerData;
const api = lists(data);

export default {
    fetch: (request, env) =>
        handle(request, { lists: api, info: data.info, assets: (r) => env.ASSETS.fetch(r) }),
    scheduled: (_controller, env) => rebuild(env.DEPLOY_HOOK_URL),
} satisfies ExportedHandler<Env>;
