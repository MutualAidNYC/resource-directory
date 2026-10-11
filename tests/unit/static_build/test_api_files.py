import pytest

from data_layer.ids import hsds_id
from models.hsds import HSDS_VERSION
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HALL,
    HOTLINE,
    ORG,
    ORPHAN,
    SAL_FRIDGE,
    SAL_HOTLINE,
    pull,
    record_ids_in,
)
from tests.unit.static_build.sample_build import BUILT_AT, files_for, nulls_in

pytestmark = pytest.mark.unit


def test_one_file_per_published_record_and_one_list_per_table():
    files = files_for(pull())

    lists = ["services", "organizations", "service_at_locations", "taxonomies", "taxonomy_terms"]
    assert {f"api/{name}.json" for name in lists} | {"api/download.json"} <= files.keys()
    assert sorted(p for p in files if p.startswith("api/services/")) == sorted(
        f"api/services/{hsds_id('services', s)}.json" for s in (FRIDGE, HOTLINE, ORPHAN)
    )
    # The quiet organization has no published service, so it gets no file.
    assert [p for p in files if p.startswith("api/organizations/")] == [
        f"api/organizations/{hsds_id('organizations', ORG)}.json"
    ]


def test_no_nulls_and_no_airtable_ids():
    for file in files_for(pull()).values():
        assert nulls_in(file.data) == [], file.path
        assert record_ids_in(file.data) == [], file.path


def test_service_without_organization_has_no_organization_id():
    files = files_for(pull())
    orphan, fridge = hsds_id("services", ORPHAN), hsds_id("services", FRIDGE)

    assert "organization_id" not in files[f"api/services/{orphan}.json"].data
    listed = {s["id"]: s for s in files["api/services.json"].data}
    assert "organization_id" not in listed[orphan]
    assert listed[fridge]["organization_id"] == hsds_id("organizations", ORG)


def test_site_only_fields_are_left_out():
    files = files_for(pull())
    fridge = files[f"api/services/{hsds_id('services', FRIDGE)}.json"].data
    listed = files["api/services.json"].data
    downloaded = files["api/download.json"].data["services"]

    for service in [fridge, *listed, *downloaded]:
        assert not {"group_name", "need_focus", "community_focus"} & service.keys()
    assert fridge["attributes"]  # the categories reach the API as attributes


def test_service_at_locations_name_their_location_by_id():
    files = files_for(pull())
    items = files["api/service_at_locations.json"].data
    fridge_sal = hsds_id("service_at_location", SAL_FRIDGE)
    detail = files[f"api/service_at_locations/{fridge_sal}.json"].data

    # The detail nests the location and names it; list items only name it.
    assert detail["location_id"] == detail["location"]["id"] == hsds_id("locations", HALL)
    assert items == [
        {
            "id": hsds_id("service_at_location", SAL_FRIDGE),
            "service_id": hsds_id("services", FRIDGE),
            "location_id": hsds_id("locations", HALL),
        },
        # The hotline has no location on purpose.
        {
            "id": hsds_id("service_at_location", SAL_HOTLINE),
            "service_id": hsds_id("services", HOTLINE),
        },
    ]


def test_download_holds_every_published_record():
    files = files_for(pull())
    download = files["api/download.json"].data
    fridge = hsds_id("services", FRIDGE)

    assert download["hsds_version"] == HSDS_VERSION
    assert download["built_at"] == BUILT_AT
    assert [s["id"] for s in download["services"]] == [
        hsds_id("services", s) for s in (FRIDGE, HOTLINE, ORPHAN)
    ]
    assert download["services"][0] == files[f"api/services/{fridge}.json"].data
    assert [o["id"] for o in download["organizations"]] == [hsds_id("organizations", ORG)]
    assert len(download["taxonomy_terms"]) == 2
