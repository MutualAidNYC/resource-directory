#!/usr/bin/env bash
# Build command for the Workers in Workers Builds:
#   production: cd .. && bash worker/scripts/build.sh          (needs AIRTABLE_API_KEY, AIRTABLE_BASE_ID)
#   preview:    cd .. && bash worker/scripts/build.sh preview  (needs PRODUCTION_URL; no Airtable token)
# Workers Builds installs worker/'s packages before running it.
set -euo pipefail

if [[ "${1:-}" == preview ]]; then
    bash worker/scripts/fetch-data.sh
else
    pip install -r requirements.txt
    python build_dataset.py
fi
(cd frontend && npm ci && npm run build)
(cd worker && npm run assemble)
