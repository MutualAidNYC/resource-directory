# Frontend

Next.js app for the Mutual Aid NYC Community Resources Library: a static site built from the files the static build writes. Nothing runs on a server, and the site doesn't call the API.

Setup and running the build are in the [root README](../README.md). This file covers what is specific to the frontend.

## Stack

- **Framework**: Next.js 16 (App Router), static export (`output: "export"`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Maps**: MapLibre GL with the [OpenFreeMap](https://openfreemap.org/) bright basemap
- **Fonts**: Karla (body) and Poppins (headings), loaded via `next/font/google`

## Data

`src/lib/data.ts` reads two files when the site builds:

| File | What the site uses it for |
|------|---------------------------|
| `api/download.json` | Every published service and organization: detail pages, organization addresses, the organizations list |
| `site-data/map.json` | Map pins, category names, search fields, filter values (site-only, not HSDS) |

From `../dist` by default (`SITE_DATA_DIR` to change it). Missing files fail the build.

## Search

`src/lib/search.ts` is shared with the API: `worker/` imports it, so a change here also changes the API's `search`. After changing it, run `npm test` in `worker/` too.


