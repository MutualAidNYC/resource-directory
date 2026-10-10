import pytest

from application_layer.map import map_data
from application_layer.publish import Published, select
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HALL,
    pull,
    record_ids_in,
)

pytestmark = pytest.mark.unit


def test_pin_comes_from_service_at_location(dataset: Dataset, published: Published):
    fridge, hotline, orphan = map_data(dataset, published).services

    assert fridge.id == hsds_id("services", FRIDGE)
    assert (fridge.latitude, fridge.longitude) == (40.7, -73.9)
    assert fridge.address == "1 Main St, New York, NY, 10001"
    assert fridge.phone == "555-0100"
    assert fridge.organization_name == "org A"
    # Hotline: no location, so no pin and no address (never the organization's).
    assert (hotline.latitude, hotline.address) == (None, None)
    assert orphan.organization_name is None


def test_address_falls_back_to_location_name():
    raw = pull()
    for location in raw["locations"]:
        if location["id"] == HALL:
            location["fields"]["addresses"] = []
    dataset = Dataset.from_pull(raw)

    fridge = map_data(dataset, select(dataset)).services[0]

    assert fridge.address == "Community Hall"


def test_service_areas_in_airtable_order(dataset: Dataset, published: Published):
    data = map_data(dataset, published)

    assert data.services[0].service_areas == ["New York City (all boroughs)", "Brooklyn"]
    assert data.serviceAreas == ["New York City (all boroughs)", "Brooklyn"]


def test_filter_values_come_from_published_services(dataset: Dataset, published: Published):
    data = map_data(dataset, published)

    # Plain names, as the site uses them ("-Not Listed" included).
    assert [c.name for c in data.needCategories] == ["-Not Listed", "Food", "Mystery"]
    assert [c.name for c in data.communityCategories] == ["Seniors"]


def test_map_has_no_airtable_ids(dataset: Dataset, published: Published):
    assert record_ids_in(map_data(dataset, published).model_dump()) == []
