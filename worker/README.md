# worker/

The Cloudflare Worker that serves the site and the API. Static files (the site and the API's records) come from `dist/public/`. The code runs only for `/api`, the five lists, and 404s. See `run_worker_first` in `wrangler.jsonc`.

| File | What it does |
|------|--------------|
| `src/index.ts` | The Worker's entry: passes each request to `handle()` |
| `src/handler.ts` | Routing, methods, CORS, errors |
| `src/query.ts` | Reads and checks a list's query parameters |
| `src/lists.ts` | Filters, searches and pages the lists |
| `src/types.ts` | The shape of `dist/worker-data/data.json` |
| `scripts/assemble.mjs` | Writes `dist/public/` from the site, the API's files and `_headers` |
| `_headers` | Response headers for static files |
| `wrangler.jsonc` | Cloudflare settings |

The list data (`dist/worker-data/data.json`, written by `python build_dataset.py`) is built into the code, not served as a file.

## Commands

Run `python build_dataset.py` (repo root) and `npm run build` (`frontend/`) first.

```bash
npm install
npm run dev         # assemble, then serve at http://localhost:8787
npm test            # vitest
npm run typecheck   # tsc
```
