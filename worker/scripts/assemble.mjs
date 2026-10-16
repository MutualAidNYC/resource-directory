/**
 * Put everything public in one folder for Cloudflare: dist/public/ is the site
 * (frontend/out/), the API's static files (dist/api/ as api/) and worker/_headers.
 *
 * Usage, from worker/, after `python build_dataset.py` (repo root) and
 * `npm run build` (frontend/):
 *   npm run assemble
 *
 * dist/public/ is deleted and rewritten each time. Nothing from dist/site-data/ or
 * dist/worker-data/ goes in it: those aren't public.
 */
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = join(ROOT, "frontend", "out");
const API = join(ROOT, "dist", "api");
const WORKER_DATA = join(ROOT, "dist", "worker-data", "data.json");
const HEADERS = join(ROOT, "worker", "_headers");
const OUT = join(ROOT, "dist", "public");
const MAX_FILES = 20_000; // static files per Worker version, Cloudflare free plan

const needed = [
  [API, "python build_dataset.py (repo root)"],
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
