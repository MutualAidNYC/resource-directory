"""Public HSDS ids, derived from Airtable record ids.

Every id the API and site publish comes from here. Airtable record ids stay
internal; the build converts them at output time.

The id is uuid5(NAMESPACE, "<table>/<record id>"). The same record always gets
the same id, and the table name keeps ids distinct across tables.

Never change NAMESPACE: every published id and URL depends on it. If records
ever move to another base or table (new record ids), first copy the current
ids into a text field and read that instead.
"""
from __future__ import annotations

import uuid
from typing import Literal, get_args

NAMESPACE = uuid.UUID("391e915f-a3b0-4edb-9fde-e6310dd1441b")

# The airtable.toml section keys. A typo in a table name would silently make
# new ids, so hsds_id accepts only these. Renaming one changes every id in
# that table.
Table = Literal[
    "services",
    "organizations",
    "service_at_location",
    "locations",
    "addresses",
    "phones",
    "languages",
    "service_areas",
    "taxonomies",
    "taxonomy_terms",
]
TABLES: frozenset[str] = frozenset(get_args(Table))


def hsds_id(table: Table, record_id: str) -> str:
    """Return the public id for an Airtable record in `table`."""
    if table not in TABLES:
        raise ValueError(f"unknown table {table!r}: must be an airtable.toml section key")
    if not record_id:
        raise ValueError("record_id is required")
    return str(uuid.uuid5(NAMESPACE, f"{table}/{record_id}"))


def attribute_id(service_record_id: str, term_record_id: str) -> str:
    """Return the id of the attribute linking a service to a taxonomy term.

    Attributes have no Airtable record; they're built from a service's
    category fields, so the id comes from the pair.
    """
    if not service_record_id or not term_record_id:
        raise ValueError("service_record_id and term_record_id are required")
    return str(uuid.uuid5(NAMESPACE, f"attributes/{service_record_id}/{term_record_id}"))
