# Mutual Aid NYC Resource Directory

Powers the Mutual Aid NYC Community Resources Library. A build pulls data from an [Airtable](https://airtable.com) base and writes it as static [HSDS](https://docs.openreferral.org/) files: the API, and the data the site is built from. The site is a static Next.js export with search and interactive maps.

Built for [Open Referral](https://openreferral.org/) and compatible with the [UK Open Referral (ORUK)](https://openreferraluk.org/) validator.

Terms: code and the API use HSDS names, **service** and **organization**; the site calls them **resource** and **group**
to better match a mutual aid ethos.


## Architecture

```
┌──────────────┐  build_dataset.py  ┌─────────────────────────────┐  npm run build  ┌──────────────┐
│   Airtable   │ ─────────────────▶ │ dist/api/  (HSDS)           │ ──────────────▶ │   Next.js    │
│   (source)   │                    │ dist/site-data/map.json     │                 │ frontend/out │
└──────────────┘                    └─────────────────────────────┘                 └──────────────┘
```

1. `python build_dataset.py` pulls the published records from Airtable once and writes the API as static HSDS files in `dist/api/` (one per record, plus lists and a full download), and the site's own data in `dist/site-data/map.json` (see [Static build](#static-build)).
2. `npm run build` in `frontend/` builds the site from `dist/api/download.json` and `dist/site-data/map.json` into plain files in `frontend/out/`. Nothing runs on a server, and the site doesn't call the API.

The old FastAPI server (`main.py`, Quick Start step 4) still runs, but the site doesn't use it. It is being removed as of October 2026.

## Prerequisites

- **Python 3.12+**
- **Node.js 20+** (for the frontend)
- An **Airtable** account with a base structured for HSDS data
- An **Airtable Personal Access Token** strictly limited to the `data.records:read` scope. **Do not use a full-access API Key.**

---

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/MutualAidNYC/resource-directory.git
cd resource-directory
```

### 2. Set up the API (Python backend)

```bash
# Create and activate virtual environment (Python 3.12+)
python3.12 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Airtable credentials:

```env
# Required — get these from https://airtable.com/create/tokens
AIRTABLE_API_KEY=pat...your_personal_access_token
AIRTABLE_BASE_ID=app...your_base_id

# Optional
SYNC_INTERVAL_MINUTES=15    # How often to re-sync (default: 15)
HOST=0.0.0.0                # Server host (default: 0.0.0.0)
PORT=8080                   # Server port (default: 8080)
```

> **Finding your Base ID:** Open your Airtable base in a browser. The URL will be `https://airtable.com/appXXXXXXXXX/...` — the `appXXXXXXXXX` part is your Base ID.

### 4. Start the API

```bash
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

On first launch, the API will sync all tables from Airtable (this takes 30-60 seconds depending on your data size). You'll see logs like:

```
INFO - Starting HSDS API...
INFO - Database initialized
INFO - Running initial Airtable sync...
INFO - Syncing table: organizations
INFO - Synced 42 records from organizations
...
INFO - Initial sync complete
```

**Verify:** Visit http://localhost:8080/docs to see the interactive API documentation.

### 5. Set up the frontend (Next.js)

The site is built from the static build's files:

```bash
python build_dataset.py   # repo root: writes dist/api/ and dist/site-data/

cd frontend
npm install
npm run dev               # http://localhost:3000
```

No `.env.local` is needed.

To check the static site as it will be deployed: `npm run build` (writes `frontend/out/`), then `npx serve out`.

---

## Static build

```bash
python build_dataset.py   # one pull from Airtable (uses .env), writes dist/api/ and dist/site-data/
```

Writes the HSDS files to `dist/api/`, the site's own data to `dist/site-data/map.json` (map pins, category names; read when the site builds, not deployed), and prints a build report listing what to fix in Airtable. It fails only if the pull fails or finds no published services. The HSDS version and its schemas: [`schemas/hsds/`](schemas/hsds/README.md).

---

## Airtable Base Setup

Your Airtable base needs tables matching the HSDS 3.0 schema. The API gets them by internal Airtable Table ID; the name-to-ID mapping is defined in `airtable/client.py`, and `airtable/sync.py` dictates which are pulled into the local cache.

`/map/services` fetches the tables marked below on every request. The rest are read only through the HSDS endpoints, from the synced
cache.

| Airtable Table | HSDS Entity | Required by `/map/services` |
|---------------|-------------|----------------------------|
| `organizations` | Organizations | **Yes** |
| `services` | Services | **Yes** |
| `locations` | Locations | **Yes** |
| `addresses` | Addresses | **Yes** |
| `service_at_location` | Service to Location links | **Yes** |
| `service_areas` | Service Areas | **Yes** |
| `phones` | Phones | **Yes** |
| `contacts` | Contacts | No |
| `schedules` | Schedules | No |
| `languages` | Languages | No |
| `taxonomies` | Taxonomies | No |
| `taxonomy_terms` | Taxonomy Terms | No |
| `programs` | Programs | No |
| `funding` | Funding | No |
| `cost_option` | Cost Options | No |
| `required_document` | Required Documents | No |
| `accessibility` | Accessibility | No |

### Connecting to your own Airtable base

The Airtable Table IDs in `airtable/client.py` are specific to the original base. To connect your own base:

1. Open your Airtable base
2. Go to **Help → API documentation** (or visit `https://airtable.com/appYOUR_BASE_ID/api/docs`)
3. Note the Table IDs for each table (they look like `tblXXXXXXXXXX`)
4. Update the `TABLE_IDS` dictionary in `airtable/client.py`:

```python
TABLE_IDS = {
    "organizations": "tblYOUR_ORG_TABLE_ID",
    "services": "tblYOUR_SVC_TABLE_ID",
    "locations": "tblYOUR_LOC_TABLE_ID",
    # ... etc
}
```

### Field mapping

Each Airtable table should have an `id` formula field that generates a consistent HSDS-compatible ID. The mapper in `transform/mapper.py` handles the field name translation between Airtable and HSDS.

Key fields per table:

- **services**: `name`, `description`, `url`, `email`, `status`, `organization` (linked), `service_at_locations` (linked)
- **organizations**: `name`, `description`, `website`, `email`, `logo`
- **locations**: `name`, `latitude`, `longitude`, `addresses` (linked)
- **addresses**: `address_1`, `address_2`, `city`, `state_province`, `postal_code`

---

## API Endpoints

### Core (HSDS Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API metadata (version, profile, OpenAPI URL) |
| `GET` | `/services` | Paginated service list (supports `?search=`, `?per_page=`, `?page=`) |
| `GET` | `/services/{id}` | Full service detail with nested relations |

### Additional

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/organizations` | Paginated organization list (supports `?search=`) |
| `GET` | `/organizations/{id}` | Organization detail with services, contacts, locations |
| `GET` | `/organizations/{id}/services` | Services for a specific organization |
| `GET` | `/taxonomies` | List taxonomies |
| `GET` | `/taxonomy_terms` | List taxonomy terms |
| `GET` | `/service_at_locations` | Service-location links |
| `GET` | `/map/services` | Services with coordinates and filter categories |

### Documentation

| URL | Description |
|-----|-------------|
| `/docs` | Swagger UI (interactive) |
| `/redoc` | ReDoc (reference) |
| `/openapi.json` | OpenAPI 3.0 schema |

---

## Configuration Reference

### Which file is read when

| File | Read by | Committed |
|------|---------|-----------|
| `.env` (repo root) | The API at startup. Also Docker Compose, for `${VAR}` substitution in `docker-compose.yml`. | No, holds your Airtable token |
| `frontend/.env.local` | `npm run dev` and a local `npm run build`. Optional. | No |

### API

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRTABLE_API_KEY` | *(required)* | Airtable Personal Access Token (must be read-only) |
| `AIRTABLE_BASE_ID` | *(required)* | Airtable Base ID (`appXXXXXXXXX`) |
| `SYNC_INTERVAL_MINUTES` | `15` | Minutes between background syncs |
| `HOST` | `127.0.0.1` | Bind address. Only read when running `python main.py` — the Dockerfile and the documented uvicorn command set it themselves. |
| `PORT` | `8080` | Server port, same scope as `HOST`. In Docker, remap with docker-compose's `ports:` rather than changing this. |
| `PUBLISHED_STATUS_VALUE` | `Published` | Old API only: show services with this status (empty = show all). The static build uses the `services` `filter` in `airtable.toml` instead. |
| `FILTER_ORGS_WITHOUT_PUBLISHED_SERVICES` | `true` | Hide orgs with no published services |
| `AIRTABLE_CONFIG` | `airtable.toml` | Tables and fields the build requests. See below. |

### Airtable tables and fields (`airtable.toml`)

The build requests only the tables and fields listed in `airtable.toml`, so nothing else leaves Airtable and private internal fields stay private. A table's optional `filter` limits which records are pulled. The committed file is Mutual Aid NYC's: only fields that have data in its base and filters for records that aren't meant to be published.

The `services` filter decides what is published: the build publishes every service it pulls, and an organization only when it has at least one of those services. Leave the filter out if your base has no publish status.

For a different base: copy the file, list your table ids (or leave `id` out to use the table name) and the fields you want, and update `AIRTABLE_CONFIG` in the `.env` file. Tables and fields you leave out are treated as empty.

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_DATA_DIR` | `../dist` | The static build's output folder, relative to `frontend/`. |
| `NEXT_PUBLIC_BASEMAP_STYLE_URL` | OpenFreeMap bright | Map basemap style URL. |

**`NEXT_PUBLIC_` variables are public.** Secrets go in the root `.env`, which only the API and `build_dataset.py` read.

---

## Production Deployment

### Docker Compose

`docker-compose.yml` and `Dockerfile` run the API only; the site is a static export (see [Set up the frontend](#5-set-up-the-frontend-nextjs)).

```bash
cp .env.example .env        # add your Airtable credentials
docker compose up -d --build
```

API on `:8080`.

---

## Troubleshooting

### API won't start

- **Missing `.env`**: Copy `.env.example` to `.env` and fill in your Airtable credentials
- **Invalid Airtable PAT**: Ensure your token has `data.records:read` scope on the correct base
- **Port conflict**: Pass a different `--port` to uvicorn. `PORT` in `.env` only applies to `python main.py`.

### No data after startup

- Check the console logs for sync errors
- Verify your `AIRTABLE_BASE_ID` matches your actual base
- Ensure the Table IDs in `airtable/client.py` match your base (see [Connecting to your own base](#connecting-to-your-own-airtable-base))

### Site build fails with "Site data not found"

The site reads `dist/api/download.json` and `dist/site-data/map.json`. Run `python build_dataset.py` from the repo root first.

### Map pins are missing

The map resolves coordinates by using `service_at_location` links → `locations` table (latitude/longitude fields in Airtable). There is no fallback: a service with no `service_at_location` link has no pin.

- **Missing latitude/longitude on location records**: Coordinates are written by a button in Airtable that runs a script for a service or organization record in Airtable to geocode the address and stores the results on the linked `location`. Check the Airtable service or organization record and the locations table.
- **No `service_at_location` links**: Check that services are linked to locations via the `service_at_location` junction table, as HSDS specifies.

---

## Standards Compliance

- [HSDS Specification](https://docs.openreferral.org/en/latest/hsds/api_reference.html): the version is `HSDS_VERSION` in `models/hsds.py`; its schemas and how to upgrade are in [`schemas/hsds/`](schemas/hsds/README.md)
- [Open Referral](https://openreferral.org/)
- [ORUK Validator](https://openreferraluk.org/developers/validator) compatible

## Contributing

We welcome contributions! To get started:
1. **Fork** the repository and clone it to your local machine.
2. **Follow the Quick Start setup** above to get your local development environment running.
3. **Commit** your changes on a feature branch.
4. **Open a Pull Request** against our `main` branch.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full contribution guidelines.

## Credits

Developed by [Sarapis](https://sarapis.org/) and maintained here by Mutual Aid NYC. Sarapis also maintains an implementation at [sarapis/hsd](https://github.com/sarapis/hsd).

## License

[MIT](LICENSE), except the vendored HSDS schemas in `schemas/hsds/` and `static_build/openapi.json` (adapted from HSDS's OpenAPI description): © Open Referral, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
