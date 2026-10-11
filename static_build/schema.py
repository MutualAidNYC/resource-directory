"""Check the record files against the HSDS JSON Schemas.

The schemas are vendored in schemas/hsds/<version>/ (python -m
static_build.fetch_schemas). Problems go in the build report and never fail
the build: most come from the data (a missing description, a website without
https://) and are fixed in Airtable.

Only record files are checked. List items and the full download carry the same
fields as the record files, so checking them would repeat every problem.

Each problem names the record to fix (the address, not the service it's shown
in) and what's wrong in plain words, once, however many files show that
record. It never holds the value, so the report doesn't repeat emails or phone
numbers. Ids here are public ids; the report turns them into Airtable records.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from data_layer.airtable_config import REPO_ROOT
from models.hsds import HSDS_VERSION
from static_build.files import ApiFile

SCHEMA_DIR = REPO_ROOT / "schemas" / "hsds" / HSDS_VERSION
# Where the schemas come from. fetch_schemas downloads them from here; the check
# only uses it to resolve their $refs to each other (nothing is fetched at build time).
SOURCE = f"https://raw.githubusercontent.com/openreferral/specification/v{HSDS_VERSION}/schema/"


class SchemasNotInstalled(RuntimeError):
    """The vendored schema folder is missing or empty."""


# Plain words for the formats the data most often breaks.
FORMATS = {
    "uri": "is not a full web address (it should start with https://)",
    "email": "is not an email address",
}


@dataclass(frozen=True)
class SchemaProblem:
    record_id: str  # public id of the record to fix: the innermost object around the problem
    label: str  # its name, or "in <name of the nearest named record around it>", or ""
    problem: str  # e.g. "missing postal_code", "url is not a full web address (…)"


def schema_problems(
    files: Iterable[ApiFile], schema_dir: Path = SCHEMA_DIR
) -> list[SchemaProblem]:
    """Each problem once, in the order found. Files with no schema are skipped.

    A record can be in several files (an address shows in its service's file
    and its organization's), so the same problem can be found more than once.
    """
    registry = _registry(schema_dir)
    found: dict[SchemaProblem, None] = {}  # a dict drops repeats and keeps the order
    for file in files:
        if file.schema is None:
            continue
        validator = Draft202012Validator(
            {"$ref": SOURCE + file.schema},
            registry=registry,
            format_checker=Draft202012Validator.FORMAT_CHECKER,
        )
        for error in validator.iter_errors(file.data):
            found[_problem(file.data, error)] = None
    return list(found)


def _registry(schema_dir: Path) -> Registry:
    """Every vendored schema under its source URL, so a $ref like "taxonomy.json" finds it."""
    paths = sorted(schema_dir.rglob("*.json"))
    if not paths:
        raise SchemasNotInstalled(
            f"No HSDS schemas in {schema_dir}. Run: python -m static_build.fetch_schemas"
        )
    return Registry().with_resources(
        (
            SOURCE + p.relative_to(schema_dir).as_posix(),
            Resource.from_contents(
                json.loads(p.read_text(encoding="utf-8")), default_specification=DRAFT202012
            ),
        )
        for p in paths
    )


def _problem(data: dict[str, Any], error: ValidationError) -> SchemaProblem:
    """The record the error is in (the innermost object with an id) and what's wrong."""
    records = [data]  # the records on the way from the top of the file to the error
    value: Any = data
    for key in error.absolute_path:
        value = value[key]
        if isinstance(value, dict) and "id" in value:
            records.append(value)
    record = records[-1]
    names = [r["name"] for r in records if r.get("name")]
    if record.get("name"):
        label = record["name"]
    elif names:
        label = f"in {names[-1]}"  # e.g. an address: the location it belongs to
    else:
        label = ""
    return SchemaProblem(str(record.get("id", "")), label, _plain(error))


def _plain(error: ValidationError) -> str:
    """What's wrong, in plain words, without the value."""
    if error.validator == "required":
        missing = [name for name in error.validator_value if name not in error.instance]
        return "missing " + ", ".join(missing)
    field = next((key for key in reversed(error.absolute_path) if isinstance(key, str)), "value")
    rule: Any = error.validator_value
    if error.validator == "format":
        return f"{field} " + FORMATS.get(rule, f"is not a valid {rule}")
    if error.validator == "enum":
        return f"{field} must be one of: " + ", ".join(map(str, rule))
    return f"{field} breaks the HSDS rule {error.validator}: {rule}"
