"""Download the HSDS JSON Schemas the build checks against.

Run from the repo root, then commit what it saves:

    python -m static_build.fetch_schemas

Pinned to the release tag, so a rerun gets the same files. Each file is saved
exactly as downloaded, at the same path it has under the specification's
schema/ folder.
"""
from __future__ import annotations

import httpx

from static_build.schema import SCHEMA_DIR, SOURCE

# HSDS schema files to download (paths inside the specification's schema/ folder).
# The build checks each record file against one of them; see static_build/files.py.
# Files in compiled/ already include everything they nest. The taxonomy files
# don't, so metadata.json is included for them.
SCHEMAS = [
    "compiled/service.json",  # api/services/<id>
    "compiled/organization.json",  # api/organizations/<id>
    "compiled/service_at_location.json",  # api/service_at_locations/<id>
    "taxonomy.json",  # api/taxonomies/<id>
    "taxonomy_term.json",  # api/taxonomy_terms/<id>
    "metadata.json",  # needed by the two taxonomy files, not checked on its own
]


def main() -> None:
    with httpx.Client(timeout=30.0) as client:
        for name in SCHEMAS:
            response = client.get(SOURCE + name)
            response.raise_for_status()
            path = SCHEMA_DIR / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(response.content)
    print(f"Saved {len(SCHEMAS)} schemas to {SCHEMA_DIR}")


if __name__ == "__main__":
    main()
