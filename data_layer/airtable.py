from __future__ import annotations

import builtins
from time import sleep
from typing import Any, TypeVar

import httpx

from config import get_settings
from data_layer.data import DataEntity, Filter, Table, TableColumn

BASE_RETRY_LIMIT = 5
BASE_RATE_LIMIT_DELAY = 0.2
BASE_URL = "https://api.airtable.com/v0"
TABLE_IDS = {
    "organizations": "tblSAotCxT28qpz5C",
    "services": "tblUV34ri18xDgs64",
    "locations": "tbljfrAgraVmN3k4C",
    "addresses": "tblj0cRXNX6cUvXl4",
    "contacts": "tblMUwgSsxSL0W248",
    "phones": "tblkIMjWC53SogK0g",
    "attributes": "tblQganalHMqv3MrU",
    "service_areas": "tblzmk5213aL7eelv",
    "languages": "tblok7nshfDBjyygQ",
    "taxonomies": "tblA73lY0HxIRTgJn",
    "taxonomy_terms": "tblTBQcmbYH3xJK75",
    "programs": "tbllCNEooPY1hEcnp",
    "schedules": "tblB1KshhZl3Kw2vs",
    "accessibility": "tblH5JHr0byFcYgWH",
    "service_at_location": "tbl6DuXeIQcMAf0lv",
    "funding": "tblk0lisFgbbzMJbl",
    "required_document": "tblYlYs5qlwUafkor",
    "cost_option": "tblw7TjA0R9MCETuT",
    "organization_identifier": "tblQRetpihQaV76Af",
}

T = TypeVar('T')

class AirtableData(DataEntity[T]):
    def __init__(
        self,
        model_class: type[T],
        table: Table,
        id_columns: list[TableColumn] | None = None,
    ):
        self.model_class = model_class
        settings = get_settings()
        self.base_id = settings.airtable_base_id
        self.api_key = settings.airtable_api_key
        self._rate_limit_delay = BASE_RATE_LIMIT_DELAY
        self.table = table
        self.id_columns = id_columns or ['id']

    def _make_request(
        self,
        endpoint: str,
        params: dict[str, Any],
        offset: int = 0,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        attempts = 0
        all_records = []

        params['offset'] = offset
        with httpx.Client(timeout=30.0) as client:
            while attempts < BASE_RETRY_LIMIT:
                url = f"{BASE_URL}/{self.base_id}/{endpoint}"
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                response = client.get(
                    url,
                    headers=headers,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()
                records = data.get("records", [])
                all_records.extend(records)

                params['offset'] = data.get("offset")
                if not params['offset']:
                    break

                if limit and len(all_records) > limit:
                    break

                sleep(BASE_RATE_LIMIT_DELAY)
                attempts += 1

        return all_records


    def list(
        self,
        filters: list[Filter] | None = None,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[T]:
        table_id = TABLE_IDS.get(self.table.name)
        params = {}
        if filters:
            conditionals = ",".join(
                [
                    f"{f.key} = '{f.value}'" for f in filters
                ]
            )
            params['filterByFormula'] = f"OR({conditionals})"

        raw_records = self._make_request(
            endpoint=table_id,
            params=params,
            offset=offset,
            limit=limit,
        )
        return [
            self.model_class(**record.get('fields', {})) for record in raw_records
        ]

    def get(
        self,
        id: str,
    ) -> T | None:
        results = self.list(
            filters=[Filter(key=col, value=id) for col in self.id_columns],
        )
        return results[0] if results else None

    def get_bulk(
        self,
        ids: builtins.list[str],
    ) -> builtins.list[T]:
        return [
            self.get(id=id) for id in ids
        ]

