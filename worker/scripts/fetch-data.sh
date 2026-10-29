#!/usr/bin/env bash
# Fill dist/ with the data production last built, instead of pulling Airtable. From the repo root:
#   PRODUCTION_URL=https://… bash worker/scripts/fetch-data.sh
# Replaces dist/api/, dist/site-data/ and dist/worker-data/ with production's
# build-data.tar.gz (see scripts/assemble.mjs).
set -euo pipefail

: "${PRODUCTION_URL:?Set PRODUCTION_URL to the URL of the production site.}"
rm -rf dist/api dist/site-data dist/worker-data
mkdir -p dist
curl -fsSL "${PRODUCTION_URL%/}/build-data.tar.gz" | tar -xz -C dist
