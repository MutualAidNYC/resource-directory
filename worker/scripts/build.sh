#!/usr/bin/env bash
# Build command for the production Worker in Workers Builds:
#   cd .. && bash worker/scripts/build.sh
# Workers Builds installs worker/'s packages before running it.
# Needs AIRTABLE_API_KEY and AIRTABLE_BASE_ID.
set -euo pipefail

pip install -r requirements.txt
python build_dataset.py
(cd frontend && npm ci && npm run build)
(cd worker && npm run assemble)
