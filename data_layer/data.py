from __future__ import annotations

import builtins
from abc import ABC, abstractmethod

from pydantic import BaseModel

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
        id: int,
    ) -> T | None:
        ...

    @abstractmethod
    def get_bulk(
        self,
        ids: builtins.list[int],
    ) -> builtins.list[T]:
        ...

class TestData[T](DataEntity[T]):
    def __init__(self, model_class: type[T], data: dict[str, T]):
        super().__init__(model_class)
        self.data = data

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
        id: int,
    ) -> T | None:
        return self.data.get(id)

    def get_bulk(
        self,
        ids: builtins.list[int],
    ) -> builtins.list[T]:
        return [self.data[id] for id in ids if id in self.data]
