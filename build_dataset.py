"""Build the static API files from one Airtable pull.

Run from the repo root (needs .env, see README):

    python build_dataset.py              # writes dist/api/ and dist/site-data/
    python build_dataset.py --out DIR    # writes DIR/api/ and DIR/site-data/

Writes DIR/api/ (see static_build/files.py), replacing what was there so no
file outlives its record, and DIR/site-data/map.json, the site's own data
(application_layer/map.py; read when the site builds, not deployed). Then
prints the build report. Exits 1 if the pull fails, if it has no published
services (nothing is written), or if the build crashes; schema problems are
reported, not fatal.
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
from static_build.report import build_report, render
from static_build.schema import SchemaProblem, SchemasNotInstalled, schema_problems

DEFAULT_OUT = REPO_ROOT / "dist"
SITE_DATA = Path("site-data") / "map.json"  # under the output folder; the site reads it


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
    files = api_files(dataset, published, terms, built_at=datetime.now(UTC).isoformat())
    write(files, args.out)
    write_site_data(map_data(dataset, published, terms), args.out)

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
    """Write the site's own data (not HSDS, not deployed) to out/site-data/map.json."""
    path = out / SITE_DATA
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            data.model_dump(mode="json", exclude_none=True),
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


def _parse(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the static API files.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="output folder; its api/ folder is deleted and rewritten, and "
        "site-data/map.json written (default: dist)",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
