"""Every table of one Airtable pull, in memory.

`Dataset.from_pull` takes the loader's output ({table name: records}) and
builds one InMemoryData per table. Table names are the airtable.toml section
keys. A table missing from the pull (left out of the config) is empty, so
another deployment can skip tables it doesn't use.
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from data_layer.data import InMemoryData
from models.airtable import (
    AddressResponse,
    LanguageResponse,
    LocationResponse,
    OrganizationResponse,
    PhoneResponse,
    ServiceAreaResponse,
    ServiceAtLocationResponse,
    ServiceResponse,
    TaxonomyResponse,
    TaxonomyTermResponse,
)

Records = list[dict[str, Any]]  # loader output: [{"id": "rec…", "fields": {…}}]


@dataclass(frozen=True)
class Dataset:
    services: InMemoryData[ServiceResponse]
    organizations: InMemoryData[OrganizationResponse]
    service_at_location: InMemoryData[ServiceAtLocationResponse]
    locations: InMemoryData[LocationResponse]
    addresses: InMemoryData[AddressResponse]
    phones: InMemoryData[PhoneResponse]
    languages: InMemoryData[LanguageResponse]
    service_areas: InMemoryData[ServiceAreaResponse]
    taxonomies: InMemoryData[TaxonomyResponse]
    taxonomy_terms: InMemoryData[TaxonomyTermResponse]

    @classmethod
    def from_pull(cls, pull: Mapping[str, Records]) -> Dataset:
        """Build from load_tables() output. Unknown table names are ignored."""

        def rows(name: str) -> Records:
            return pull.get(name, [])

        return cls(
            services=InMemoryData.from_records(ServiceResponse, rows("services")),
            organizations=InMemoryData.from_records(
                OrganizationResponse, rows("organizations")
            ),
            service_at_location=InMemoryData.from_records(
                ServiceAtLocationResponse, rows("service_at_location")
            ),
            locations=InMemoryData.from_records(LocationResponse, rows("locations")),
            addresses=InMemoryData.from_records(AddressResponse, rows("addresses")),
            phones=InMemoryData.from_records(PhoneResponse, rows("phones")),
            languages=InMemoryData.from_records(LanguageResponse, rows("languages")),
            service_areas=InMemoryData.from_records(ServiceAreaResponse, rows("service_areas")),
            taxonomies=InMemoryData.from_records(TaxonomyResponse, rows("taxonomies")),
            taxonomy_terms=InMemoryData.from_records(
                TaxonomyTermResponse, rows("taxonomy_terms")
            ),
        )

    def skipped(self) -> dict[str, list[tuple[str, str]]]:
        """Records that didn't fit their model, by table: (record id, reason)."""
        return {
            name: table.skipped
            for name, table in vars(self).items()
            if isinstance(table, InMemoryData) and table.skipped
        }
