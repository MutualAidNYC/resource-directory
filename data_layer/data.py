from __future__ import annotations

import builtins
from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Any

from pydantic import BaseModel, ValidationError

class Table(BaseModel):
    name: str

class TableColumn(BaseModel):
    name: str

class Filter(BaseModel):
    key: str
    value: str

class DataEntity[T](ABC):
    def __init__(self, model_class: type[T]):
        self.model_class = model_class
        super().__init__()

    @abstractmethod
    def list(
        self,
        filters: list[Filter] | None = None,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[T]:
        ...

    @abstractmethod
    def get(
        self,
        id: str,
    ) -> T | None:
        ...

    @abstractmethod
    def get_bulk(
        self,
        ids: builtins.list[str],
    ) -> builtins.list[T]:
        ...

class InMemoryData[T](DataEntity[T]):
    """A table held in memory, keyed by Airtable record id.

    Built once from the loader's bulk pull; every lookup after that is a dict
    access. Ids here are Airtable record ids. Public HSDS ids are made at
    output time (data_layer/ids.py).
    """

    def __init__(self, model_class: type[T], data: dict[str, T]):
        super().__init__(model_class)
        self.data = data
        self.skipped: builtins.list[tuple[str, str]] = []

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
        skipped: builtins.list[tuple[str, str]] = []
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
        table = cls(model_class, data)
        table.skipped = skipped
        return table

    def list(
        self,
        filters: list[Filter] | None = None,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[T]:
        return [
            self.data[index]
            for index in self.data
            if not filters or any(
                getattr(self.data[index], filter.key) == filter.value
                for filter in filters
            )
        ][offset : (offset + limit) if limit else None]

    def get(
        self,
        id: str,
    ) -> T | None:
        return self.data.get(id)

    def get_bulk(
        self,
        ids: builtins.list[str],
    ) -> builtins.list[T]:
        return [self.data[id] for id in ids if id in self.data]
