/**
 * Put everything public in one folder for Cloudflare: dist/public/ is the site
 * (frontend/out/), the API's static files (dist/api/ as api/), worker/_headers and
 * build-data.tar.gz.
 *
 * Usage, from worker/, after `python build_dataset.py` (repo root) and
 * `npm run build` (frontend/):
 *   npm run assemble
 *
 * dist/public/ is deleted and rewritten each time. build-data.tar.gz is the data
 * build's output (dist/api/, dist/site-data/, dist/worker-data/), for builds
 * without an Airtable token (scripts/fetch-data.sh).
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = join(ROOT, "dist");
const SITE = join(ROOT, "frontend", "out");
const API = join(DIST, "api");
const SITE_DATA = join(DIST, "site-data", "map.json");
const WORKER_DATA = join(DIST, "worker-data", "data.json");
const HEADERS = join(ROOT, "worker", "_headers");
const OUT = join(DIST, "public");
const BUILD_DATA = "build-data.tar.gz"; // scripts/fetch-data.sh downloads it by this name
const MAX_FILES = 20_000; // static files per Worker version, Cloudflare free plan

const needed = [
  [API, "python build_dataset.py (repo root)"],
  [SITE_DATA, "python build_dataset.py (repo root)"],
  [WORKER_DATA, "python build_dataset.py (repo root)"],
  [SITE, "npm run build (frontend/)"],
];
const missing = needed.filter(([path]) => !existsSync(path));
if (missing.length) {
  for (const [path, run] of missing) console.error(`Not found: ${relative(ROOT, path)}. Run: ${run}`);
  process.exit(1);
}
if (existsSync(join(SITE, "api"))) {
  console.error("frontend/out/api exists: the site can't have pages under /api, the API's path.");
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
cpSync(SITE, OUT, { recursive: true });
cpSync(API, join(OUT, "api"), { recursive: true });
cpSync(HEADERS, join(OUT, "_headers"));
// COPYFILE_DISABLE: macOS's tar would otherwise add ._ files.
execFileSync("tar", ["-czf", join(OUT, BUILD_DATA), "-C", DIST, "api", "site-data", "worker-data"], {
  stdio: "inherit",
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});

const files = countFiles(OUT);
console.log(`Wrote ${relative(ROOT, OUT)}: ${files} files (Cloudflare's limit: ${MAX_FILES}).`);
if (files > MAX_FILES) {
  console.error("Too many files for one Worker version on the free plan.");
  process.exit(1);
}

function countFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (n, entry) => n + (entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1),
    0,
  );
}
