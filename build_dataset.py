"""Build the API, the site's data and the API's list data from one Airtable pull.

Run from the repo root (needs .env, see README):

    python build_dataset.py              # writes dist/api/, dist/site-data/, dist/worker-data/
    python build_dataset.py --out DIR    # writes DIR/api/, DIR/site-data/, DIR/worker-data/

Writes three things into the output folder (dist/ unless --out is given):

- api/: the HSDS files the API serves (static_build/files.py). Deleted and
  rewritten every build.
- site-data/map.json: what the site needs besides the HSDS download: each
  service's map pin, category names, organization name and service areas, and the
  filter lists (application_layer/map.py). The site reads it when it builds.
- worker-data/data.json: the lists, filters and search fields the API's list
  routes serve (worker/; static_build/worker_data.py). Built into their code.

All three also go out in build-data.tar.gz (worker/scripts/assemble.mjs), which
preview builds download instead of pulling Airtable.

Then prints the build report. Exits 1 without writing anything if the pull
fails or finds no published services, and exits 1 if the build crashes.
Schema problems go in the report, they don't fail the build.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from application_layer.map import MapData, map_data
from application_layer.publish import select
from application_layer.taxonomies import Terms
from config import get_settings
from data_layer.airtable_config import REPO_ROOT, load_config
from data_layer.dataset import Dataset
from data_layer.loader import AirtableLoadError, load_tables
from static_build.files import ApiFile, api_files
from static_build.records import Records
from static_build.report import build_report, render
from static_build.schema import SchemaProblem, SchemasNotInstalled, schema_problems
from static_build.worker_data import worker_data

DEFAULT_OUT = REPO_ROOT / "dist"
SITE_DATA = Path("site-data") / "map.json"  # under the output folder; the site reads it
WORKER_DATA = Path("worker-data") / "data.json"  # under the output folder, built into worker/


def main(argv: list[str] | None = None) -> int:
    args = _parse(argv)
    started = time.monotonic()
    try:
        tables = pull_from_airtable()
    # ValueError covers missing settings and a bad airtable.toml (AirtableConfigError);
    # OSError, an airtable.toml that can't be read.
    except (AirtableLoadError, OSError, ValueError) as e:
        print(f"Build failed: {e}", file=sys.stderr)
        return 1
    pull_seconds = time.monotonic() - started

    dataset = Dataset.from_pull(tables)
    published = select(dataset)
    if not published.services:
        # Most likely the services filter in airtable.toml, or the status values it
        # matches, changed. Stop before writing, so an empty directory is never deployed.
        print(
            "Build failed: no published services in the pull, so nothing was written. "
            "Check the services filter in airtable.toml against the status values in Airtable.",
            file=sys.stderr,
        )
        return 1
    terms = Terms.from_dataset(dataset)
    records = Records.build(dataset, published, terms)
    files = api_files(records, built_at=datetime.now(UTC).isoformat())
    write(files, args.out)
    site = map_data(dataset, published, terms)
    write_site_data(site, args.out)
    write_worker_data(worker_data(records, published, terms, site), args.out)

    problems: list[SchemaProblem] = []
    note = None
    try:
        problems = schema_problems(files)
    except SchemasNotInstalled as e:
        note = str(e)

    report = build_report(
        pull_seconds=pull_seconds,
        tables=tables,
        dataset=dataset,
        published=published,
        terms=terms,
        files=files,
        schema_problems=problems,
        schema_note=note,
    )
    print(render(report))
    return 0


def pull_from_airtable() -> dict[str, list[dict[str, Any]]]:
    """Every configured table, fetched with the settings in .env / the environment."""
    try:
        settings = get_settings()
    except ValidationError as e:
        # Name the settings only: pydantic's own message echoes the other values, the key too.
        missing = ", ".join(str(err["loc"][0]).upper() for err in e.errors())
        raise ValueError(f"missing or invalid settings: {missing}") from None
    config = load_config(settings.airtable_config)
    return load_tables(settings.airtable_api_key, settings.airtable_base_id, config)


def write(files: list[ApiFile], out: Path) -> None:
    """Replace out/api with these files."""
    api = out / "api"
    if api.exists():
        shutil.rmtree(api)
    for file in files:
        path = (out / file.path).resolve()
        # File names are public ids. They're UUIDs today, but if they're ever read from an
        # Airtable field (see data_layer/ids.py), a bad one must not write outside api/.
        if not path.is_relative_to(api.resolve()):
            raise ValueError(f"refusing to write outside {api}: {file.path}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(file.data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )


def write_site_data(data: MapData, out: Path) -> None:
    """Write the site's own data (not HSDS) to out/site-data/map.json."""
    _write_json(out / SITE_DATA, data.model_dump(mode="json", exclude_none=True))


def write_worker_data(data: dict[str, Any], out: Path) -> None:
    """Write what the API's list routes serve from memory to out/worker-data/data.json."""
    _write_json(out / WORKER_DATA, data)


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


def _parse(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the static API files.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="output folder; its api/ folder is deleted and rewritten, and "
        "site-data/map.json and worker-data/data.json written (default: dist)",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
