import pytest

from application_layer.map import map_data
from application_layer.publish import Published, select
from application_layer.taxonomies import Terms
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HALL,
    SAL_FRIDGE,
    edit,
    pull,
    rec,
    record_ids_in,
)

pytestmark = pytest.mark.unit

ANNEX = "recLocAnnex000001"
ANNEX_ADDRESS = "recAddressAnnex01"
SAL_ANNEX = "recSalAnnex000001"


def test_pin_comes_from_service_at_location(dataset: Dataset, published: Published, terms: Terms):
    fridge, hotline, orphan = map_data(dataset, published, terms).services

    assert fridge.id == hsds_id("services", FRIDGE)
    assert (fridge.latitude, fridge.longitude) == (40.7, -73.9)
    assert fridge.address == "1 Main St, New York, NY, 10001"
    assert fridge.phone == "555-0100"
    assert fridge.organization_name == "org A"
    # Hotline: no location, so no pin and no address (never the organization's).
    assert (hotline.latitude, hotline.address) == (None, None)
    assert orphan.organization_name is None


def test_location_without_an_address_has_none():
    # No fallback to the location's name: incomplete data shows up as missing, not guessed.
    raw = pull()
    edit(raw, HALL, addresses=[])
    dataset = Dataset.from_pull(raw)

    fridge = map_data(dataset, select(dataset), Terms.from_dataset(dataset)).services[0]

    assert (fridge.latitude, fridge.address) == (40.7, None)


def test_pin_and_address_come_from_the_first_location_with_coordinates():
    raw = pull()
    edit(raw, HALL, latitude=None, longitude=None)
    raw["addresses"].append(rec(ANNEX_ADDRESS, address_1="2 Side St", city="New York"))
    raw["locations"].append(
        rec(ANNEX, latitude=40.8, longitude=-73.8, addresses=[ANNEX_ADDRESS])
    )
    raw["service_at_location"].append(rec(SAL_ANNEX, locations=[ANNEX]))
    edit(raw, FRIDGE, service_at_locations=[SAL_FRIDGE, SAL_ANNEX])
    dataset = Dataset.from_pull(raw)

    fridge = map_data(dataset, select(dataset), Terms.from_dataset(dataset)).services[0]

    assert (fridge.latitude, fridge.longitude) == (40.8, -73.8)
    assert fridge.address == "2 Side St, New York"  # not the hall's, which has no coordinates


def test_service_areas_in_airtable_order(dataset: Dataset, published: Published, terms: Terms):
    data = map_data(dataset, published, terms)

    assert data.services[0].service_areas == ["New York City (all boroughs)", "Brooklyn"]
    assert data.serviceAreas == ["New York City (all boroughs)", "Brooklyn"]


def test_categories_are_the_matched_terms(dataset: Dataset, published: Published, terms: Terms):
    fridge, hotline, _ = map_data(dataset, published, terms).services

    # Plain names from the matched terms: "-Not Listed" is never a category.
    assert (fridge.needFocus, fridge.communityFocus) == (["Food"], ["Seniors"])
    assert hotline.needFocus == []  # "Mystery" matches no term (build report)


def test_filter_values_come_from_published_services(
    dataset: Dataset, published: Published, terms: Terms
):
    data = map_data(dataset, published, terms)

    # Matched terms only: no "-Not Listed", no unmatched "Mystery", no unused "Legal".
    assert [c.name for c in data.needCategories] == ["Food"]
    assert [c.name for c in data.communityCategories] == ["Seniors"]


def test_map_has_no_airtable_ids(dataset: Dataset, published: Published, terms: Terms):
    assert record_ids_in(map_data(dataset, published, terms).model_dump()) == []
