/**
 * Copy the build's site data into src/data/, the committed copy that Vercel
 * builds from (see src/lib/data.ts).
 *
 * Usage, from frontend/, after `python build_dataset.py` in the repo root:
 *   npm run data:copy            # reads ../dist
 *   SITE_DATA_DIR=DIR npm run data:copy
 *
 * Temporary: goes away once previews build from the published download.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(FRONTEND, process.env.SITE_DATA_DIR || "../dist");
const OUT = join(FRONTEND, "src", "data");

const files = [
  [join(DIST, "api", "download.json"), join(OUT, "download.json")],
  [join(DIST, "site-data", "map.json"), join(OUT, "map.json")],
];

const missing = files.filter(([from]) => !existsSync(from)).map(([from]) => from);
if (missing.length) {
  console.error(
    `Not found: ${missing.join(", ")}\nRun \`python build_dataset.py\` from the repo root first.`
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [from, to] of files) {
  copyFileSync(from, to);
  console.log(`Copied ${from} → ${to}`);
}
