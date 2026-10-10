"""HSDS objects for linked records (phones, languages, locations, addresses).

Shared by the service and organization outputs. Links to records missing from the
pull (deleted, or in a table the config leaves out) are skipped. Ids passed in
are Airtable record ids; every id written out goes through hsds_id with the
airtable.toml table name.
"""
from __future__ import annotations

from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import LocationResponse
from models.hsds import Address, Language, Location, Phone

def phones(dataset: Dataset, ids: list[str] | None) -> list[Phone]:
    """The linked phone records, in link order."""
    return [
        Phone(id=hsds_id("phones", p.id), number=p.number)
        for p in dataset.phones.get_bulk(ids or [])
    ]


def languages(dataset: Dataset, ids: list[str] | None) -> list[Language]:
    """The linked language records, in link order."""
    return [
        Language(id=hsds_id("languages", lang.id), name=lang.name, code=lang.code)
        for lang in dataset.languages.get_bulk(ids or [])
    ]


def addresses(dataset: Dataset, ids: list[str] | None) -> list[Address]:
    """The linked address records, in link order."""
    return [
        Address(
            id=hsds_id("addresses", a.id),
            address_1=a.address_1,
            address_2=a.address_2,
            city=a.city,
            state_province=a.state_province,
            postal_code=a.postal_code,
            country=a.country,
            address_type=a.address_type,
        )
        for a in dataset.addresses.get_bulk(ids or [])
    ]


def location(dataset: Dataset, record: LocationResponse) -> Location:
    """One location record with its addresses."""
    return Location(
        id=hsds_id("locations", record.id),
        location_type=record.location_type,
        name=record.name,
        latitude=record.latitude,
        longitude=record.longitude,
        addresses=addresses(dataset, record.addresses),
    )
