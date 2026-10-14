import dataclasses

import pytest

from data_layer.ids import hsds_id
from static_build.report import PartialLocation, Report, build_report, render
from static_build.schema import SchemaProblem
from tests.unit.application_layer.sample_pull import (
    ADDRESS,
    FRIDGE,
    HALL,
    HOTLINE,
    ORPHAN,
    edit,
    pull,
)
from tests.unit.static_build.sample_build import Pull, build

pytestmark = pytest.mark.unit


def report_for(raw: Pull, schema_problems: list[SchemaProblem] | None = None) -> Report:
    dataset, published, terms, files = build(raw)
    return build_report(
        pull_seconds=1.0,
        tables=raw,
        dataset=dataset,
        published=published,
        terms=terms,
        files=files,
        schema_problems=schema_problems or [],
    )


def test_report_lists_what_needs_fixing():
    report = report_for(pull())

    assert report.pulled["services"] == 3
    assert report.written == {
        "services": 3,
        "organizations": 1,
        "service_at_locations": 1,  # the hotline's links no location, so it isn't written
        "taxonomies": 2,
        "taxonomy_terms": 2,
    }
    assert report.without_organization == [ORPHAN]
    assert report.without_service_area == [HOTLINE, ORPHAN]  # the fridge has two
    assert report.unmatched_categories == {HOTLINE: ["Mystery"]}
    assert report.partial_locations == []
    assert report.service_names == {HOTLINE: "Hotline", ORPHAN: "Orphan"}


def test_location_without_coordinates_is_reported():
    raw = pull()
    edit(raw, HALL, latitude=None, longitude=None)

    assert report_for(raw).partial_locations == [PartialLocation(FRIDGE, HALL, "coordinates")]


def test_location_without_address_is_reported():
    raw = pull()
    edit(raw, HALL, addresses=[])

    assert report_for(raw).partial_locations == [PartialLocation(FRIDGE, HALL, "address")]


def test_location_without_coordinates_or_address_is_reported():
    # No map pin and no address, so the location shows nowhere.
    raw = pull()
    edit(raw, HALL, latitude=None, longitude=None, addresses=[])

    report = report_for(raw)

    assert report.partial_locations == [
        PartialLocation(FRIDGE, HALL, "coordinates or address")
    ]
    assert f"location {HALL} has no coordinates or address (service {FRIDGE}" in render(report)


def test_rendered_report_names_records_but_no_contact_details():
    text = render(report_for(pull()))

    assert f"{ORPHAN} (Orphan)" in text
    assert f"{HOTLINE} (Hotline): Mystery" in text
    for contact_detail in ("fridge@example.org", "555-0100", "555-0200", "1 Main St"):
        assert contact_detail not in text


def test_schema_problems_name_the_airtable_record_to_fix():
    address = hsds_id("addresses", ADDRESS)
    problems = [
        SchemaProblem(address, "in Community Hall", "missing postal_code"),
        SchemaProblem("not-an-airtable-record", "", "link_type breaks the HSDS rule type: string"),
    ]

    text = render(report_for(pull(), problems))

    assert "Problems to fix in Airtable (HSDS" in text
    assert "rules, not fatal): 2" in text
    assert f"  addresses {ADDRESS} (in Community Hall): missing postal_code" in text
    # Something with no Airtable record of its own (an attribute) keeps its public id.
    assert "  record not-an-airtable-record: link_type breaks" in text


def test_schema_check_that_did_not_run_says_why():
    report = dataclasses.replace(report_for(pull()), schema_note="No HSDS schemas.")

    assert "not checked. No HSDS schemas." in render(report)
