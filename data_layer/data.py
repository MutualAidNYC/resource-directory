from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from pydantic import ValidationError

class InMemoryData[T]:
    """A table held in memory, keyed by Airtable record id.

    Built once from the loader's bulk pull; every lookup after that is a dict
    access. Ids here are Airtable record ids. Public HSDS ids are made at
    output time (data_layer/ids.py).
    """

    def __init__(self, data: dict[str, T]):
        self.data = data
        self.skipped: list[tuple[str, str]] = []

    @classmethod
    def from_records(
        cls,
        model_class: type[T],
        records: Iterable[dict[str, Any]],
    ) -> InMemoryData[T]:
        """Build from loader records ({"id": "rec…", "fields": {…}}).

        A record that doesn't fit the model is left out and listed in
        `skipped` as (record id, reason), so one bad row can't stop the build.
        The reason names fields only, never their values.
        """
        data: dict[str, T] = {}
        skipped: list[tuple[str, str]] = []
        for record in records:
            record_id = record["id"]
            try:
                data[record_id] = model_class(**{**record.get("fields", {}), "id": record_id})
            except ValidationError as e:
                reason = "; ".join(
                    f"{'.'.join(str(p) for p in err['loc'])}: {err['type']}"
                    for err in e.errors(include_url=False, include_input=False)
                )
                skipped.append((record_id, reason))
        table = cls(data)
        table.skipped = skipped
        return table

    def all(self) -> list[T]:
        """Every record, in pull order."""
        return list(self.data.values())

    def get(self, id: str) -> T | None:
        return self.data.get(id)

    def get_bulk(self, ids: list[str]) -> list[T]:
        """The records with these ids, in the order given. Missing ids are skipped."""
        return [self.data[id] for id in ids if id in self.data]
