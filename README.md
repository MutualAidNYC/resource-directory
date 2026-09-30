# Mutual Aid NYC Resource Directory

Powers the Mutual Aid NYC Community Resources Library. A FastAPI application that syncs data from an [Airtable](https://airtable.com) base and serves it through an [HSDS 3.0](https://docs.openreferral.org/) compliant REST API. Includes a Next.js search frontend with interactive maps.

Built for [Open Referral](https://openreferral.org/) and compatible with the [UK Open Referral (ORUK)](https://openreferraluk.org/) validator.

## Architecture

```
┌──────────────┐   sync every 15 min   ┌──────────────┐
│   Airtable   │ ────────────────────▶ │  SQLite DB   │
│   (source)   │                       │   (cache)    │
└──────────────┘                       └──────┬───────┘
                                              │
                                       ┌──────┴───────┐
                                       │   FastAPI    │
                                       │ HSDS 3.0 API │
                                       │    :8080     │
                                       └──────┬───────┘
                                              │
                                       ┌──────┴───────┐
                                       │   Next.js    │
                                       │  frontend/   │
                                       │    :3000     │
                                       └──────────────┘
```

The dev site on Vercel skips the backend entirely — there is nothing hosted to
talk to yet:

```
┌──────────────────┐        ┌──────────────┐
│  snapshot.json   │ ─────▶ │   Next.js    │
│   (committed)    │        │  on Vercel   │
└──────────────────┘        └──────────────┘
```

**How it works:**
1. On startup, the API pulls all records from your Airtable base into a local SQLite database
2. A background task re-syncs every 15 minutes (configurable)
3. The API serves HSDS-formatted data from the fast local cache
4. The frontend queries the API and renders services, organizations, and a map

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
cd frontend
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

```bash
cd frontend

# Install dependencies
npm install

# Configure the API URL
cp .env.example .env.local

# Start the dev server
npm run dev
```

**Verify:** Visit http://localhost:3000 to see the directory frontend.

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
| `frontend/.env.local` | `npm run dev` and a local `npm run build`. Excluded from the Docker image. | No |
| `docker-compose.yml` | Sets the frontend container's variables directly. | Yes |

### API

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRTABLE_API_KEY` | *(required)* | Airtable Personal Access Token (must be read-only) |
| `AIRTABLE_BASE_ID` | *(required)* | Airtable Base ID (`appXXXXXXXXX`) |
| `SYNC_INTERVAL_MINUTES` | `15` | Minutes between background syncs |
| `HOST` | `127.0.0.1` | Bind address. Only read when running `python main.py` — the Dockerfile and the documented uvicorn command set it themselves. |
| `PORT` | `8080` | Server port, same scope as `HOST`. In Docker, remap with docker-compose's `ports:` rather than changing this. |
| `PUBLISHED_STATUS_VALUE` | `Published` | Only show services with this status (empty = show all) |
| `FILTER_ORGS_WITHOUT_PUBLISHED_SERVICES` | `true` | Hide orgs with no published services |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | API URL for browser-side requests. Baked in at build time. |
| `INTERNAL_API_URL` | *(unset)* | API URL for server-side rendering, read at runtime. `http://api:8080` under Docker Compose. Takes precedence over `NEXT_PUBLIC_API_URL` on the server. |
| `NEXT_PUBLIC_USE_SNAPSHOT` | *(unset)* | `1` serves data from the committed snapshot instead of an API. |
| `NEXT_PUBLIC_BASEMAP_STYLE_URL` | OpenFreeMap bright | Map basemap style URL. |

**`NEXT_PUBLIC_` variables are public.** Secrets go in the root `.env`, which only the API reads.

---

## Production Deployment

### Option A: Docker Compose

`docker-compose.yml`, `Dockerfile`, and `frontend/Dockerfile` are in the repo.

```bash
cp .env.example .env        # add your Airtable credentials
docker compose up -d --build
```

API on `:8080`, frontend on `:3000`. The frontend reaches the API over the Compose network at `http://api:8080`, set as `INTERNAL_API_URL` at runtime. It waits on the API's healthcheck before starting. Fetched data is cached for 60 seconds.

---

### Option B: Dev site with no backend (current)

The backend is not hosted yet. Until we refactor and implement a deploy solution, the dev site on Vercel serves its data from a snapshot committed to the repo, with no API deployed and no secrets in Vercel.

Root Directory `frontend`, no environment variables. Full instructions, including how to regenerate the snapshot, are in [`frontend/README.md`](frontend/README.md#vercel--dev-site-no-backend-current-setup).

## Project Structure

```
resource-directory/
├── main.py                    # FastAPI app entry point + lifespan handler
├── config.py                  # Pydantic settings (loads from .env)
├── requirements.txt           # Python dependencies
├── .env.example               # Template for environment variables
│
├── airtable/                  # Airtable integration
│   ├── client.py              # Async HTTP client with pagination + rate limiting
│   └── sync.py                # Background sync loop (Airtable → SQLite)
│
├── db/
│   └── database.py            # SQLite schema + CRUD operations (aiosqlite)
│
├── transform/
│   └── mapper.py              # Airtable fields → HSDS Pydantic models
│
├── models/
│   └── hsds.py                # HSDS 3.0 Pydantic models + response types
│
├── routes/                    # FastAPI route handlers
│   ├── root.py                # GET / (API metadata)
│   ├── services.py            # GET /services, /services/{id}
│   ├── organizations.py       # GET /organizations, /organizations/{id}
│   ├── taxonomies.py          # GET /taxonomies, /taxonomy_terms
│   ├── service_at_locations.py
│   └── map.py                 # GET /map/services
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── page.tsx       # Home (category grid)
│   │   │   ├── services/      # Service list + detail + map
│   │   │   └── organizations/ # Org list + detail
│   │   ├── components/        # Reusable UI components
│   │   └── lib/
│   │       └── api.ts         # Typed API client
│   └── package.json
│
├── LICENSE                    # MIT
└── CONTRIBUTING.md
```

---

## Troubleshooting

### API won't start

- **Missing `.env`**: Copy `.env.example` to `.env` and fill in your Airtable credentials
- **Invalid Airtable PAT**: Ensure your token has `data.records:read` scope on the correct base
- **Port conflict**: Pass a different `--port` to uvicorn and point `NEXT_PUBLIC_API_URL` in `frontend/.env.local` at it. `PORT` in `.env` only applies to `python main.py`.

### No data after startup

- Check the console logs for sync errors
- Verify your `AIRTABLE_BASE_ID` matches your actual base
- Ensure the Table IDs in `airtable/client.py` match your base (see [Connecting to your own base](#connecting-to-your-own-airtable-base))

### Frontend can't reach API

- Ensure the API is running on the URL specified in `NEXT_PUBLIC_API_URL`
- Check CORS — the API allows all origins by default (`allow_origins=["*"]`)
- In production, both services must be accessible to the browser

### Map pins are missing

The map resolves coordinates by using `service_at_location` links → `locations` table (latitude/longitude fields in Airtable). There is no fallback: a service with no `service_at_location` link has no pin.

- **Missing latitude/longitude on location records**: Coordinates are written by a button in Airtable that runs a script for a service or organization record in Airtable to geocode the address and stores the results on the linked `location`. Check the Airtable service or organization record and the locations table.
- **No `service_at_location` links**: Check that services are linked to locations via the `service_at_location` junction table — this is the HSDS 3.0 standard.

---

## Standards Compliance

- [HSDS 3.0 Specification](https://docs.openreferral.org/en/latest/hsds/api_reference.html)
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

[MIT](LICENSE)
