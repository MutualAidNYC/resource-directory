# Frontend

Next.js app for the Community Resources Library: a static site built from the files the static build writes. Nothing runs on a server, and the site doesn't call the API.

Setup and running the build are in the [root README](../README.md). This file covers what is specific to the frontend.

## Stack

- **Framework**: Next.js 16 (App Router), static export (`output: "export"`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4. Colors are classes named as in the mutualaid.nyc theme. Shared class strings are in `src/lib/styles.ts`, icons in `src/components/ui/Icon.tsx` (the footer's social icons are inlined from Simple Icons, CC0).
- **Maps**: MapLibre GL with the [OpenFreeMap](https://openfreemap.org/) positron basemap; nearby pins cluster (MapLibre built-in)
- **Fonts**: Karla (body), Poppins (headings), and Francois One (short labels, `font-label`), loaded via `next/font/google`.

## Your own site

What belongs to Mutual Aid NYC is in these places. Change them to run the directory for another group:

| What | Where |
|------|-------|
| Names, copy, header, footer and social links, submit and suggest links, the map's starting view | `src/site.config.ts` |
| Logo | `public/logo.png` (square) |
| Category icons | `public/icons/need_categories/` (below) |
| Colors | `@theme` in `src/app/globals.css`. Check new colors meet WCAG 2.2 AA contrast |
| Fonts | `src/app/layout.tsx` (`next/font` needs the font names in code) |
| The API's title and publisher | `../static_build/openapi.json`, `../static_build/worker_data.py` |

Leave `submitUrl`, `suggestUrl` or `newsletterUrl` out of the config to hide that link.

**Category icons.** The home page's category tiles show `<slug>.png` from `public/icons/need_categories/`. The slug is the category name in lowercase with each run of other characters replaced by `-` ("Delivery/Transport" → `delivery-transport.png`). Square PNG, at least 60×60, shown at 32–40px, with empty alt text because the name is beside it. A category without an icon shows a plain circle. Renaming a category in Airtable means renaming its icon.

## Data

`src/lib/data.ts` reads two files when the site builds:

| File | What the site uses it for |
|------|---------------------------|
| `api/download.json` | Every published service and organization: detail pages, organization addresses, the organizations list |
| `site-data/map.json` | Map pins, category names, search fields, filter values (site-only, not HSDS) |

From `../dist` by default (`SITE_DATA_DIR` to change it). Missing files fail the build.

The API docs page (`/api-docs`) is built from `../static_build/openapi.json` by `src/lib/openapi.ts`, not from `dist/`, so a branch's preview shows that branch's description. A response or parameter the page can't show fails the build.

## Search

`src/lib/search.ts` is shared with the API: `worker/` imports it, so a change here also changes the API's `search`. After changing it, run `npm test` in `worker/` too.
