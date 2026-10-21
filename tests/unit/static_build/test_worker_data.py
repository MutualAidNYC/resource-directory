import re

import pytest

from data_layer.airtable_config import REPO_ROOT
from data_layer.ids import hsds_id
from models.hsds import HSDS_VERSION
from static_build.worker_data import SEARCH_FIELDS
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HALL,
    HOTLINE,
    ORG,
    ORPHAN,
    SAL_FRIDGE,
    pull,
    record_ids_in,
)
from tests.unit.static_build.sample_build import nulls_in, worker_data_for

pytestmark = pytest.mark.unit

LISTS = ["services", "organizations", "service_at_locations", "taxonomies", "taxonomy_terms"]


def test_every_list_holds_every_published_record():
    data = worker_data_for(pull())

    assert [s["name"] for s in data["services"]] == ["Fridge", "Hotline", "Orphan"]
    assert [o["id"] for o in data["organizations"]] == [hsds_id("organizations", ORG)]
    assert len(data["taxonomy_terms"]) == 2
    assert all(data[name] for name in LISTS)


def test_no_nulls_and_no_airtable_ids():
    data = worker_data_for(pull())

    assert nulls_in(data) == []
    assert record_ids_in(data) == []


def test_services_list_items():
    listed = {s["id"]: s for s in worker_data_for(pull())["services"]}
    fridge, orphan = listed[hsds_id("services", FRIDGE)], listed[hsds_id("services", ORPHAN)]

    assert fridge["organization_id"] == hsds_id("organizations", ORG)
    assert fridge["assured_date"] == "2026-01-02"
    assert "organization_id" not in orphan  # its organization isn't published


def test_service_at_locations_name_their_location_by_id():
    items = worker_data_for(pull())["service_at_locations"]

    assert items == [
        {
            "id": hsds_id("service_at_location", SAL_FRIDGE),
            "service_id": hsds_id("services", FRIDGE),
            "location_id": hsds_id("locations", HALL),
        },
    ]


def test_service_terms_name_each_services_terms():
    data = worker_data_for(pull())
    terms = {t["id"] for t in data["taxonomy_terms"]}
    service_terms = data["service_terms"]

    assert service_terms.keys() == {s["id"] for s in data["services"]}
    assert len(service_terms[hsds_id("services", FRIDGE)]) == 2
    assert set(service_terms[hsds_id("services", FRIDGE)]) <= terms
    assert service_terms[hsds_id("services", HOTLINE)] == []


def test_service_search_has_the_sites_search_fields():
    data = worker_data_for(pull())
    fridge = next(s for s in data["service_search"] if s["id"] == hsds_id("services", FRIDGE))

    assert fridge["needFocus"] == ["Food"]  # matched names: no "-Not Listed"
    assert "latitude" not in fridge and "phone" not in fridge


def test_search_fields_match_the_sites():
    # The keys SERVICE_FIELDS may read (frontend/src/lib/search.ts).
    source = (REPO_ROOT / "frontend" / "src" / "lib" / "search.ts").read_text(encoding="utf-8")
    keys = re.search(r"SERVICE_SEARCH_KEYS = \[(.*?)\] as const", source, re.DOTALL)

    assert keys, "SERVICE_SEARCH_KEYS not found in search.ts"
    assert set(re.findall(r"'(\w+)'", keys.group(1))) == SEARCH_FIELDS


def test_info():
    info = worker_data_for(pull())["info"]

    assert info["version"] == HSDS_VERSION
    assert info["publisher"] == {"name": "Mutual Aid NYC", "website": "https://mutualaid.nyc"}
