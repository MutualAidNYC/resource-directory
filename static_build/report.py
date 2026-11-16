"""The build report: what the build left out, couldn't match or found incomplete.

Printed in the build log, for whoever keeps the data in Airtable, and posted
once a day as the digest (static_build/digest.py). It never fails the build. It
names records by Airtable record id (to find them in Airtable) and by name where
they have one; it never holds contact details.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, get_args

from application_layer import records
from application_layer.publish import Published
from application_layer.taxonomies import Terms, unmatched_categories
from data_layer.dataset import Dataset
from data_layer.ids import Table, hsds_id
from models.hsds import HSDS_VERSION
from static_build.files import ApiFile
from static_build.schema import SchemaProblem


@dataclass(frozen=True)
class PartialLocation:
    """A published service's location missing coordinates, an address, or both.

    Every location should have both: without coordinates there's no map pin,
    and the map shows an address only with its pin.
    """

    service: str  # service record id
    location: str  # location record id
    missing: str  # "coordinates", "address" or "coordinates or address" (both)


@dataclass(frozen=True)
class Report:
    pull_seconds: float  # how long the Airtable pull took
    pulled: dict[str, int]  # table → records pulled
    written: dict[str, int]  # api folder → record files written
    skipped: dict[str, list[tuple[str, str]]]  # table → (record id, reason)
    without_organization: list[str]  # service record ids
    without_service_area: list[str]  # service record ids; every published service needs one
    unmatched_categories: dict[str, list[str]]  # service record id → category names
    partial_locations: list[PartialLocation]
    schema_problems: list[SchemaProblem]
    schema_note: str | None = None  # why the schema check didn't run
    service_names: dict[str, str] = field(default_factory=dict)  # for services named above
    # Public id → (table, Airtable record id), for the records in schema_problems.
    airtable_records: dict[str, tuple[str, str]] = field(default_factory=dict)


def build_report(
    *,
    pull_seconds: float,
    tables: Mapping[str, list[Any]],
    dataset: Dataset,
    published: Published,
    terms: Terms,
    files: list[ApiFile],
    schema_problems: list[SchemaProblem],
    schema_note: str | None = None,
) -> Report:
    no_area = [s.id for s in published.services if not s.service_areas]
    unmatched = unmatched_categories(published, terms)
    partial = partial_locations(dataset, published)
    named = {*published.without_organization, *no_area, *unmatched, *(p.service for p in partial)}
    return Report(
        pull_seconds=pull_seconds,
        pulled={name: len(rows) for name, rows in tables.items()},
        written=_record_files_per_folder(files),
        skipped=dataset.skipped(),
        without_organization=published.without_organization,
        without_service_area=no_area,
        unmatched_categories=unmatched,
        partial_locations=partial,
        schema_problems=schema_problems,
        schema_note=schema_note,
        service_names={s.id: s.name for s in published.services if s.id in named},
        airtable_records=_airtable_records(dataset, {p.record_id for p in schema_problems}),
    )


def _record_files_per_folder(files: list[ApiFile]) -> dict[str, int]:
    """e.g. {"services": 336, …}. Record files are api/<folder>/<id>; the download
    and openapi.json sit directly in api/, so they aren't counted."""
    folders = [f.path.split("/")[1] for f in files if f.path.count("/") == 2]
    return dict(Counter(folders))


def _airtable_records(dataset: Dataset, public_ids: set[str]) -> dict[str, tuple[str, str]]:
    """Public id → (table, Airtable record id) for the given public ids."""
    found: dict[str, tuple[str, str]] = {}
    for table in get_args(Table):
        for record in getattr(dataset, table).all():
            public_id = hsds_id(table, record.id)
            if public_id in public_ids:
                found[public_id] = (table, record.id)
    return found


def partial_locations(dataset: Dataset, published: Published) -> list[PartialLocation]:
    """Published services' locations missing coordinates, an address, or both.

    Services with no location are left out: that's on purpose (hotlines, citywide).
    A service_at_location without a location is skipped by the build (records.py).
    """
    found: list[PartialLocation] = []
    for service in published.services:
        for _, place in records.service_places(dataset, service):
            has_address = bool(dataset.addresses.get_bulk(place.addresses or []))
            missing = []
            if not place.has_coordinates:
                missing.append("coordinates")
            if not has_address:
                missing.append("address")
            if missing:
                found.append(PartialLocation(service.id, place.id, " or ".join(missing)))
    return found


SCHEMA_TITLE = f"Problems to fix in Airtable (HSDS {HSDS_VERSION} rules, not fatal)"

# (table, Airtable record id, line): the record to fix, for a link, and how the report lists it.
Item = tuple[str, str, str]


def problems(report: Report) -> list[tuple[str, list[Item]]]:
    """The report's sections that name records to fix in Airtable, in order, for the build
    log (render) and the digest (static_build/digest.py). Leaves out the schema section when
    the check didn't run."""
    name = report.service_names

    def service(i: str, more: str = "") -> Item:
        return ("services", i, f"{i} ({name.get(i, '?')}){more}")

    sections = [
        (
            "Records skipped (didn't fit their model)",
            [(t, i, f"{t} {i}: {why}") for t, rows in report.skipped.items() for i, why in rows],
        ),
        (
            "Published services with no published organization",
            [service(i) for i in report.without_organization],
        ),
        (
            "Published services with no service area",
            [service(i) for i in report.without_service_area],
        ),
        (
            "Category names that match no taxonomy term",
            [service(i, f": {', '.join(n)}") for i, n in report.unmatched_categories.items()],
        ),
        (
            "Published services' locations missing coordinates or an address",
            [
                (
                    "locations",
                    p.location,
                    f"location {p.location} has no {p.missing} (service {p.service}, "
                    f"{name.get(p.service, '?')})",
                )
                for p in report.partial_locations
            ],
        ),
    ]
    if not report.schema_note:
        # Sorted, so each table's records are listed together.
        schema = [_schema_item(p, report.airtable_records) for p in report.schema_problems]
        sections.append((SCHEMA_TITLE, sorted(schema, key=lambda item: item[2])))
    return sections


def render(report: Report) -> str:
    """The report as text for the build log."""
    lines = [
        "Build report",
        f"Pulled {sum(report.pulled.values())} records from Airtable in "
        f"{report.pull_seconds:.1f} s: {_counts(report.pulled)}",
        f"Wrote {sum(report.written.values())} record files: {_counts(report.written)}",
    ]
    for title, items in problems(report):
        lines += _section(title, [line for _, _, line in items])
    if report.schema_note:
        lines.append(f"{SCHEMA_TITLE}: not checked. {report.schema_note}")
    return "\n".join(lines)


def _schema_item(problem: SchemaProblem, airtable: Mapping[str, tuple[str, str]]) -> Item:
    """Its line is e.g. "addresses recAbc… (in Community Hall): missing postal_code"."""
    # Something with no Airtable record of its own (an attribute) keeps its public id.
    table, record_id = airtable.get(problem.record_id, ("record", problem.record_id))
    label = f" ({problem.label})" if problem.label else ""
    return (table, record_id, f"{table} {record_id}{label}: {problem.problem}")


def _section(title: str, items: list[str]) -> list[str]:
    if not items:
        return [f"{title}: none"]
    return [f"{title}: {len(items)}"] + [f"  {item}" for item in items]


def _counts(counts: Mapping[str, int]) -> str:
    return ", ".join(f"{name} {n}" for name, n in counts.items()) or "none"
