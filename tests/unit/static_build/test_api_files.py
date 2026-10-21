import json
import re

import pytest

from data_layer.ids import hsds_id
from models.hsds import (
    HSDS_VERSION,
    Organization,
    OrganizationSummary,
    Service,
    ServiceSummary,
)
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
from tests.unit.static_build.sample_build import BUILT_AT, files_for, nulls_in, worker_data_for

pytestmark = pytest.mark.unit


def test_one_file_per_published_record():
    files = files_for(pull())

    assert {p for p in files if p.count("/") == 1} == {"api/download.json", "api/openapi.json"}
    assert sorted(p for p in files if p.startswith("api/services/")) == sorted(
        f"api/services/{hsds_id('services', s)}" for s in (FRIDGE, HOTLINE, ORPHAN)
    )
    # The quiet organization has no published service, so it gets no file.
    assert [p for p in files if p.startswith("api/organizations/")] == [
        f"api/organizations/{hsds_id('organizations', ORG)}"
    ]


def test_no_nulls_and_no_airtable_ids():
    for file in files_for(pull()).values():
        assert nulls_in(file.data) == [], file.path
        assert record_ids_in(file.data) == [], file.path


def test_service_without_organization_has_no_organization_id():
    files = files_for(pull())
    orphan, fridge = hsds_id("services", ORPHAN), hsds_id("services", FRIDGE)

    assert "organization_id" not in files[f"api/services/{orphan}"].data
    assert files[f"api/services/{fridge}"].data["organization_id"] == hsds_id("organizations", ORG)


SITE_ONLY = {"group_name", "need_focus", "community_focus", "service_count"}


def test_api_models_have_no_site_only_fields():
    # The site's own fields live in site-data/map.json (application_layer/map.py).
    for model in (Service, ServiceSummary, Organization, OrganizationSummary):
        assert not SITE_ONLY & model.model_fields.keys(), model.__name__


def test_api_files_have_no_site_only_fields():
    files = files_for(pull())
    fridge = files[f"api/services/{hsds_id('services', FRIDGE)}"].data
    downloaded = files["api/download.json"].data
    lists = worker_data_for(pull())

    records = [
        fridge,
        *lists["services"],
        *lists["organizations"],
        *downloaded["services"],
        *downloaded["organizations"],
    ]
    for record in records:
        assert not SITE_ONLY & record.keys()
    assert fridge["attributes"]  # the categories reach the API as attributes


def test_service_at_location_detail_nests_its_location_and_names_it():
    files = files_for(pull())
    fridge_sal = hsds_id("service_at_location", SAL_FRIDGE)
    detail = files[f"api/service_at_locations/{fridge_sal}"].data

    assert detail["location_id"] == detail["location"]["id"] == hsds_id("locations", HALL)


def test_service_at_location_without_a_location_is_never_published():
    files = files_for(pull())
    empty = hsds_id("service_at_location", SAL_HOTLINE)
    hotline = files[f"api/services/{hsds_id('services', HOTLINE)}"].data

    assert f"api/service_at_locations/{empty}" not in files
    assert empty not in {sal["id"] for sal in hotline.get("service_at_locations", [])}


def test_download_holds_every_published_record():
    files = files_for(pull())
    download = files["api/download.json"].data
    fridge = hsds_id("services", FRIDGE)

    assert download["hsds_version"] == HSDS_VERSION
    assert download["built_at"] == BUILT_AT
    assert [s["id"] for s in download["services"]] == [
        hsds_id("services", s) for s in (FRIDGE, HOTLINE, ORPHAN)
    ]
    assert download["services"][0] == files[f"api/services/{fridge}"].data
    assert [o["id"] for o in download["organizations"]] == [hsds_id("organizations", ORG)]
    assert len(download["taxonomy_terms"]) == 2


def test_openapi_links_name_the_hsds_version():
    spec = files_for(pull())["api/openapi.json"].data
    links = re.findall(r"specification/([^/]+)/schema/", json.dumps(spec))

    assert links and set(links) == {f"v{HSDS_VERSION}"}
