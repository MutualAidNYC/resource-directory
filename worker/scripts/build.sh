#!/usr/bin/env bash
# The production Worker's Workers Builds build command, run from the repo root (so the
# build image reads .python-version and .nvmrc):
#   bash worker/scripts/build.sh
# Needs AIRTABLE_API_KEY (a build secret) and AIRTABLE_BASE_ID (a build variable).
# build_dataset.py fails without them, so a production build never ships without data.
set -euo pipefail

pip install -r requirements.txt
python build_dataset.py
(cd frontend && npm ci && npm run build)
(cd worker && npm ci && npm run assemble)
