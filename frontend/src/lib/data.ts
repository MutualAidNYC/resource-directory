/**
 * The site's data, read from disk when the site builds (static export: nothing
 * is fetched at runtime). Server-only: pages call these, then pass plain data
 * to client components.
 *
 * Two files, both written by `python build_dataset.py` (repo root):
 * - api/download.json: every published HSDS record (groups, resources, addresses…)
 * - site-data/map.json: the site's own data (map pins, category names, search fields)
 *
 * Where they're read from:
 * - Default: the build's output folder, `SITE_DATA_DIR` (default `../dist`).
 * - The committed copy in src/data/ when `SITE_DATA=snapshot` or on Vercel, which
 *   can't run the build. Refresh it with `npm run data:copy` after a build.
 *
 * Missing files fail the site build, so it never quietly builds from the wrong data.
 */
import fs from 'node:fs';
import path from 'node:path';
import type {
    Download,
    MapData,
    MapService,
    Organization,
    OrganizationListItem,
    Service,
    ServiceSummary,
} from './types';

const USE_COMMITTED_COPY = process.env.SITE_DATA === 'snapshot' || !!process.env.VERCEL;

function dataFiles(): { download: string; map: string } {
    if (USE_COMMITTED_COPY) {
        const dir = path.join(process.cwd(), 'src', 'data');
        return { download: path.join(dir, 'download.json'), map: path.join(dir, 'map.json') };
    }
    const dir = path.resolve(process.cwd(), process.env.SITE_DATA_DIR || '../dist');
    return {
        download: path.join(dir, 'api', 'download.json'),
        map: path.join(dir, 'site-data', 'map.json'),
    };
}

const HOW_TO_FIX = USE_COMMITTED_COPY
    ? 'Refresh the committed copy: run `python build_dataset.py` from the repo root, then `npm run data:copy`.'
    : 'Run `python build_dataset.py` from the repo root first, or set SITE_DATA=snapshot to use the committed copy.';

function readJson<T>(file: string): T {
    let text: string;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (e) {
        throw new Error(`Site data not found: ${file}. ${HOW_TO_FIX}`, { cause: e });
    }
    return JSON.parse(text) as T;
}

interface SiteData {
    download: Download;
    map: MapData;
    servicesById: Map<string, Service>;
    organizationsById: Map<string, Organization>;
    mapById: Map<string, MapService>;
}

let cached: SiteData | undefined;

/** Both files, read once per build process. */
function siteData(): SiteData {
    if (!cached) {
        const files = dataFiles();
        const download = readJson<Download>(files.download);
        const map = readJson<MapData>(files.map);
        cached = {
            download,
            map,
            servicesById: new Map(download.services.map((s) => [s.id, s])),
            organizationsById: new Map(download.organizations.map((o) => [o.id, o])),
            mapById: new Map(map.services.map((s) => [s.id, s])),
        };
    }
    return cached;
}

/** Every published resource for the map and search, plus the filter values. */
export function getMapData(): MapData {
    return siteData().map;
}

/** One resource's map entry: its category names, pin and search fields. */
export function getMapService(id: string): MapService | undefined {
    return siteData().mapById.get(id);
}

export function serviceIds(): string[] {
    return siteData().download.services.map((s) => s.id);
}

export function getService(id: string): Service | undefined {
    return siteData().servicesById.get(id);
}

export function organizationIds(): string[] {
    return siteData().download.organizations.map((o) => o.id);
}

export function getOrganization(id: string): Organization | undefined {
    return siteData().organizationsById.get(id);
}

/** Every published group with its number of resources, sorted by name ignoring case. */
export function listOrganizations(): OrganizationListItem[] {
    const { download } = siteData();
    const counts = new Map<string, number>();
    for (const s of download.services) {
        if (s.organization_id) counts.set(s.organization_id, (counts.get(s.organization_id) ?? 0) + 1);
    }
    return download.organizations
        .map((o) => ({ ...o, service_count: counts.get(o.id) ?? 0 }))
        .sort((a, b) => compareNames(a.name, b.name));
}

/** A group's published resources, in the build's order, as list items. */
export function servicesOf(organizationId: string): ServiceSummary[] {
    return siteData()
        .download.services.filter((s) => s.organization_id === organizationId)
        .map(({ id, organization_id, name, status, description, url, email }) => ({
            id,
            organization_id,
            name,
            status,
            description,
            url,
            email,
        }));
}

/** How many resources and groups are published. */
export function counts(): { services: number; organizations: number } {
    const { download } = siteData();
    return { services: download.services.length, organizations: download.organizations.length };
}

/** Like the build's `sorted(key=name.lower())`, so the site and the API list agree. */
function compareNames(a: string, b: string): number {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
}
