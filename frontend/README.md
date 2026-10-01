# Frontend

Next.js app for the Mutual Aid NYC Community Resources Library, a responsive
search interface over an HSDS 3.0 API.

Setup, environment variables, and running the stack are in the [root README](../README.md). This file covers what is specific to the frontend.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Maps**: MapLibre GL with the [OpenFreeMap](https://openfreemap.org/) bright basemap
- **Fonts**: Karla (body) and Poppins (headings), loaded via `next/font/google`

## API Requirements

This application expects an HSDS 3.0 compliant API with these endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /` | API metadata |
| `GET /services` | List services (paginated) |
| `GET /services/{id}` | Service details |
| `GET /organizations` | List organizations (paginated) |
| `GET /organizations/{id}` | Organization details |
| `GET /service_at_locations` | Service-location links |

## Deployment

### Vercel — dev site, no backend (current setup)

The API is not hosted yet, so the dev site temporarily serves its data from a snapshot committed to this repo. No environment variables are needed: a deployed build with no API URL configured uses the snapshot automatically, on branch previews and production alike.

Set the project's Root Directory to `frontend`. Leave `NEXT_PUBLIC_API_URL` unset — if it is set on a deployment and points at localhost, the app raises an explicit error instead of loading nothing.

#### Search engines are blocked

Every page emits `<meta name="robots" content="noindex">`, set unconditionally in `layout.tsx`. This deployment serves snapshot data frozen at dump time and should not turn up in search results.

#### Regenerating the snapshot

Data is frozen at dump time. To refresh it, run the API locally, then:

```bash
cd frontend
node scripts/dump-snapshot.mjs          # defaults to http://localhost:8080
```

That rewrites `src/data/snapshot.json` (committed, ~1.5 MB). Commit it for the change to reach a deployment.

Locally the real API is used by default. To run against the snapshot instead:

```bash
NEXT_PUBLIC_USE_SNAPSHOT=1 npm run dev
```

#### What this is, and when it goes away

Scaffolding with an expiry. Three files plus one branch in `fetchApi`:

| File | Role |
|---|---|
| `scripts/dump-snapshot.mjs` | Dumps the dataset from a running API |
| `src/data/snapshot.json` | The committed dataset |
| `src/lib/snapshot.ts` | Answers endpoint requests from that JSON |

When the backend has a public URL: set `NEXT_PUBLIC_API_URL` to it, which switches deployments off the snapshot on its own, then delete all three files, the `USE_SNAPSHOT` block in `api.ts`, and the `robots` line in `layout.tsx` too.

Do not build features on top of the snapshot layer.

Known limits: search is a substring match over name and description rather than the real query, so it is fine for design review but not for judging search
quality. Endpoints the app does not call are absent and return 404.

### Vercel — with a hosted API

Once a backend exists, set `NEXT_PUBLIC_API_URL` to its public URL. Deployments switch off the snapshot automatically.
