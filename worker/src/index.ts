/** The Cloudflare Worker entry: passes each request to handle() with the data and static files. */
import raw from 'worker-data';

import { handle } from './handler';
import { lists } from './lists';
import type { WorkerData } from './types';

interface Env {
    ASSETS: Fetcher;
}

const data = raw as WorkerData;
const api = lists(data);

export default {
    fetch: (request, env) =>
        handle(request, { lists: api, info: data.info, assets: (r) => env.ASSETS.fetch(r) }),
} satisfies ExportedHandler<Env>;
