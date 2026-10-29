#!/usr/bin/env bash
# Fill dist/ with the data production last built, instead of pulling Airtable. From the repo root:
#   PRODUCTION_URL=https://… bash worker/scripts/fetch-data.sh
# Replaces dist/api/, dist/site-data/ and dist/worker-data/ with production's
# build-data.tar.gz (see scripts/assemble.mjs). If the download fails, dist/ is left as it was.
set -euo pipefail

: "${PRODUCTION_URL:?Set PRODUCTION_URL to the URL of the production site.}"
mkdir -p dist
tmp=$(mktemp -d dist/.fetch.XXXXXX)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "${PRODUCTION_URL%/}/build-data.tar.gz" | tar -xz -C "$tmp"
for dir in api site-data worker-data; do
    [[ -d "$tmp/$dir" ]] || { echo "build-data.tar.gz has no $dir/." >&2; exit 1; }
done
rm -rf dist/api dist/site-data dist/worker-data
mv "$tmp/api" "$tmp/site-data" "$tmp/worker-data" dist/
