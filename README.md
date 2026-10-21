# Mutual Aid NYC Resource Directory

Powers the Mutual Aid NYC Community Resources Library. A build pulls the directory's data from an [Airtable](https://airtable.com) base and turns it into a static website and a read-only [HSDS](https://docs.openreferral.org/) API.

It follows core HSDS ([Open Referral](https://openreferral.org/)), and the build checks every record against HSDS's JSON Schemas.

Code and the API use HSDS's terms, **service** and **organization**. The site calls them **resource** and **group**, to better match a mutual aid ethos.

## How it works

```
Airtable
   │  1. python build_dataset.py     (repo root)
   ▼
dist/            the API's files, and the data the site and the API's code need
   │  2. npm run build               (frontend/)
   ▼
frontend/out/    the website
   │  3. npm run assemble            (worker/)
   ▼
dist/public/     the website and the API's files, ready to serve
```

Cloudflare serves `dist/public/` as static files. Code in `worker/` answers the API's lists (`/api/services` and others), which need paging and search. To run everything locally, see [Quick Start](#quick-start).

`main.py` and the folders it uses (`routes/`, `airtable/` and others) are an old server that nothing uses. They will be removed in November 2026.

## Prerequisites

- Python 3.12+
- Node.js 22+ (`.nvmrc`)
- An Airtable base with the tables described in [Airtable base](#airtable-base)
- An Airtable personal access token with only the `data.records:read` scope. Don't use a token with write access.

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/MutualAidNYC/resource-directory.git
cd resource-directory
```

### 2. Set up Python

```bash
# Create and activate virtual environment (Python 3.12+)
python3.12 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Add your Airtable settings

```bash
cp .env.example .env
```

Set these in `.env` (create a token at https://airtable.com/create/tokens):

```env
AIRTABLE_API_KEY=pat...your_personal_access_token
AIRTABLE_BASE_ID=app...your_base_id
```

The base id is the `app…` part of the base's URL: `https://airtable.com/appXXXXXXXXX/…`.

### 4. Build the data

```bash
python build_dataset.py   # repo root: pulls Airtable, writes dist/
```

### 5. Run the site and the API

```bash
cd frontend
npm install
npm run build             # writes frontend/out/
cd ../worker
npm install
npm run dev               # http://localhost:8787: the site, and the API at /api
```

`npm run dev` writes `dist/public/` and serves it the way Cloudflare does. It needs no Cloudflare account.

To check changes: `pytest tests/unit` and `ruff check .` at the repo root (with the venv active), `npm run lint` in `frontend/`, and `npm test` and `npm run typecheck` in `worker/`.

### 6. Optional: work on the site with live reload

```bash
cd frontend
npm run dev               # http://localhost:3000; reloads as you edit; no API
```

To pick up new data from Airtable, rerun step 4.

## Static build

```bash
python build_dataset.py   # pulls Airtable once (uses .env), writes dist/
```

It writes:

- `dist/api/`: the API's static files (one per record, the full download, the OpenAPI description).
- `dist/site-data/map.json`: the site's map pins and category names. Read when the site builds; not deployed.
- `dist/worker-data/data.json`: the lists, filters and search fields the API's code serves. Built into that code; not deployed as a file.

It then prints a build report of what to fix in Airtable. The build fails only if the pull fails or finds no published services. For the HSDS version and its schemas, see [`schemas/hsds/`](schemas/hsds/README.md).

## Airtable base

The build reads only the tables and fields listed in `airtable.toml` (see [Airtable tables and fields](#airtable-tables-and-fields-airtabletoml)). Field names must match Airtable exactly.

The base needs:

- **Publishing.** The `services` filter in `airtable.toml` decides which services are published (Mutual Aid NYC's: `{status} = 'Published'`). Without a filter, every service is published. An organization is shown only if it has a published service. The `organizations` filter can exclude more (Mutual Aid NYC's excludes "Do Not Publish").
- **Categories.** Services' category fields are matched by name to `taxonomy_terms` in two taxonomies. The fields (`needFocus`, `communityFocus`) are read in `models/airtable.py`, and the taxonomy names ("MANYC Need", "MANYC Community Focus") are set in `application_layer/taxonomies.py`.
- **Locations.** Services link to locations only through `service_at_location`. Coordinates are on `locations` (`latitude`, `longitude`). This app doesn't geocode: add coordinates in Airtable.
- **Service areas** are the areas a service is for, not where it is located (specified in the `service_areas` field).
- **Ids.** Public ids (UUIDs) are made from Airtable record ids, so no id field is needed. Moving records to another base or table changes their ids.

### Connecting your own base

1. Copy `airtable.toml`. For each table, set `id` to its Airtable table id (`tbl…`, under **Help → API documentation**), or leave `id` out to use the table's name. List the fields to read and set the filters. If your category fields or taxonomies have other names, see **Categories** above.
2. In `.env`, set `AIRTABLE_BASE_ID`, and `AIRTABLE_CONFIG` to your copy's path.
3. Run `python build_dataset.py` and fix what the build report lists.

## API

A read-only [HSDS](https://docs.openreferral.org/en/latest/hsds/api_reference.html) API at `/api`. Records, the full download and the OpenAPI description are static files. Code in `worker/` answers `/api` and the lists.

| Endpoint | Served as | Returns |
|----------|-----------|---------|
| `/api` | code | API info: HSDS version, publisher, `openapi_url` |
| `/api/services`, `/api/organizations`, `/api/service_at_locations`, `/api/taxonomies`, `/api/taxonomy_terms` | code | An HSDS list, paginated |
| `/api/<list>/{id}` | static file | One record, fully nested |
| `/api/download.json` | static file | Every published record |
| `/api/openapi.json` | static file | The OpenAPI description |

`/api/organizations/{id}` includes the organization's locations and phones but not its services. For those, use `/api/services?organization_id={id}`.

### List parameters

| Parameter | Lists | Notes |
|-----------|-------|-------|
| `page`, `per_page` | all | 50 per page by default; at most 1,000 |
| `search` | all | Search returns the records that contain every word you search for |
| `organization_id` | services, service_at_locations | |
| `taxonomy_term_id`, `taxonomy_id` | services, organizations, service_at_locations | For organizations: those with a matching service |
| `taxonomy_id`, `parent_id`, `top_only` | taxonomy_terms | |


Errors return JSON: `{"error": "…"}`. A request gets a 400 if it uses an HSDS parameter this API doesn't support (`modified_after`, `minimal`, `full`, `full_service`, `postcode`, `proximity`, or `format` other than `json`), has a bad value, or repeats a parameter. To get everything, use `/api/download.json`. Parameters HSDS doesn't define are ignored. Only GET and HEAD are allowed.


## Configuration

### Files

| File | Read by | Committed |
|------|---------|-----------|
| `.env` (repo root) | `build_dataset.py` | No: it holds your Airtable token |
| `airtable.toml` | `build_dataset.py` | Yes |
| `frontend/.env.local` | `npm run dev` and `npm run build` in `frontend/`. Optional. | No |
| `worker/wrangler.jsonc` | wrangler: `npm run dev` in `worker/`, and deploys | Yes |

### Build settings (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRTABLE_API_KEY` | *(required)* | Airtable personal access token (read-only) |
| `AIRTABLE_BASE_ID` | *(required)* | Airtable base id (`appXXXXXXXXX`) |
| `AIRTABLE_CONFIG` | `airtable.toml` | The tables and fields to read (see below) |

`SYNC_INTERVAL_MINUTES`, `HOST`, `PORT`, `PUBLISHED_STATUS_VALUE` and `FILTER_ORGS_WITHOUT_PUBLISHED_SERVICES` are read only by the old server and will be removed with it.

### Airtable tables and fields (`airtable.toml`)

The build requests only the tables and fields listed here, so nothing else leaves Airtable and private fields stay private. A table's optional `filter` limits which records are pulled. Tables and fields left out are treated as empty. The committed file is Mutual Aid NYC's. To use another base, see [Connecting your own base](#connecting-your-own-base).

### Frontend settings

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_DATA_DIR` | `../dist` | The build's output folder, relative to `frontend/` |
| `NEXT_PUBLIC_BASEMAP_STYLE_URL` | OpenFreeMap bright | The map's basemap style URL |

`NEXT_PUBLIC_` variables are public. Put secrets only in the root `.env`.

## Deployment

The site and the API deploy together to Cloudflare as a Worker (`worker/wrangler.jsonc`) that serves `dist/public/`. See [`worker/`](worker/README.md). `docker-compose.yml` and `Dockerfile` run only the old server and will be removed with it.

## Before launch

Until the site launches, it asks search engines not to index it. To launch, remove that from all three places:

- `frontend/src/app/layout.tsx`: `robots: { index: false }`
- `worker/_headers`: the `X-Robots-Tag: noindex` rule
- `worker/src/handler.ts`: `NOINDEX`, and the `x-robots-tag` check in `worker/test/handler.test.ts`

## Troubleshooting

### The build fails

The build prints the reason:

- **`missing or invalid settings: …`**: set the named variables in `.env` (see [step 3](#3-add-your-airtable-settings)).
- **`Airtable config not found: …`**: `AIRTABLE_CONFIG` points to a file that doesn't exist.
- **`Airtable request failed (401, 403 or 404 …)`**: check that the token is valid, has the `data.records:read` scope and access to the base in `AIRTABLE_BASE_ID`, and that the table ids in `airtable.toml` belong to that base (see [Connecting your own base](#connecting-your-own-base)).
- **`no published services in the pull`**: the `services` filter in `airtable.toml` matches no records. Check it against the status values in Airtable.

### The site build fails with "Site data not found"

The site reads `dist/api/download.json` and `dist/site-data/map.json`. Run `python build_dataset.py` from the repo root first.

### Map pins are missing

A service gets a pin from its first location with coordinates, found through `service_at_location`. There is no fallback.

- **The location has no coordinates.** Add `latitude` and `longitude` to the location in Airtable. The build report lists locations with an address but no coordinates.
- **The service has no location.** Link it to a location through `service_at_location`.

## Standards

- [HSDS](https://docs.openreferral.org/en/latest/hsds/api_reference.html): the version is `HSDS_VERSION` in `models/hsds.py`. Its schemas, and how to upgrade, are in [`schemas/hsds/`](schemas/hsds/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Credits

Developed by [Sarapis](https://sarapis.org/) and maintained by Mutual Aid NYC. Sarapis also maintains an implementation at [sarapis/hsd](https://github.com/sarapis/hsd).

## License

[MIT](LICENSE), except the vendored HSDS schemas in `schemas/hsds/` and `static_build/openapi.json` (adapted from HSDS's OpenAPI description): © Open Referral, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
