# worker/

The Cloudflare Worker that serves the site and the API. Static files (the site and the API's records) come from `dist/public/`. The code runs only for `/api`, the five lists, 404s, and the daily Cron Trigger. See `run_worker_first` in `wrangler.jsonc`.

| File | What it does |
|------|--------------|
| `src/index.ts` | The Worker's entry: passes each request to `handle()` |
| `src/handler.ts` | Routing, methods, CORS, errors |
| `src/query.ts` | Reads and checks a list's query parameters |
| `src/lists.ts` | Filters, searches and pages the lists |
| `src/types.ts` | The shape of `dist/worker-data/data.json` |
| `src/rebuild.ts` | The daily rebuild: the Cron Trigger POSTs the deploy hook |
| `scripts/assemble.mjs` | Writes `dist/public/` from the site, the API's files, `_headers` and `build-data.tar.gz` (the data build's output) |
| `scripts/build.sh` | Workers Builds' build command, production or preview (see the root README's Deployment) |
| `scripts/fetch-data.sh` | Fills `dist/` from production's `build-data.tar.gz`, without an Airtable token |
| `scripts/airtable-rebuild.js` | Pasted into Airtable as an automation that rebuilds on `status` changes in the services table |
| `_headers` | Response headers for static files |
| `wrangler.jsonc` | Cloudflare settings; `env.preview` is the preview Worker |

The list data (`dist/worker-data/data.json`, written by `python build_dataset.py`) is built into the code.

To deploy, see [Deployment](../README.md#deployment) in the root README.
