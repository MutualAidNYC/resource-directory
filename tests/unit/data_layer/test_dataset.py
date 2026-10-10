import dataclasses

import pytest

from data_layer.airtable_config import DEFAULT_PATH, load_config
from data_layer.dataset import Dataset
from models.airtable import ServiceResponse

pytestmark = pytest.mark.unit


def test_table_names_match_airtable_toml():
    # Public ids use these names (hsds_id), so they must be the config's section keys.
    assert {f.name for f in dataclasses.fields(Dataset)} == set(load_config(DEFAULT_PATH).tables)


def test_missing_tables_are_empty():
    dataset = Dataset.from_pull({"services": []})

    assert dataset.languages.list() == []
    assert dataset.taxonomy_terms.get("recAnything000001") is None


def test_reads_airtable_shapes():
    dataset = Dataset.from_pull(
        {
            "services": [
                {
                    "id": "recService0000001",
                    "fields": {"name": "S", "needFocus": ["Food"], "communityFocus": ["Youth"]},
                }
            ],
            "service_at_location": [
                {"id": "recSal00000000001", "fields": {"services": ["recService0000001"]}}
            ],
            "locations": [
                {"id": "recLocation000001", "fields": {"location_type": ["physical"]}}
            ],
            "addresses": [{"id": "recAddress0000001", "fields": {"address_type": []}}],
            "service_areas": [
                {"id": "recArea0000000001", "fields": {"name": "Bronx", "x-order": 2}}
            ],
            "taxonomy_terms": [
                {
                    "id": "recTerm0000000001",
                    "fields": {"name": "Food", "taxonomy": ["recTax0000000001"]},
                }
            ],
        }
    )

    service = dataset.services.get("recService0000001")
    assert service is not None
    assert (service.need_focus, service.community_focus) == (["Food"], ["Youth"])
    sal = dataset.service_at_location.get("recSal00000000001")
    assert sal is not None and sal.service_id == "recService0000001"
    location = dataset.locations.get("recLocation000001")
    assert location is not None and location.location_type == "physical"
    address = dataset.addresses.get("recAddress0000001")
    assert address is not None and address.address_type is None
    area = dataset.service_areas.get("recArea0000000001")
    assert area is not None and area.order == 2
    term = dataset.taxonomy_terms.get("recTerm0000000001")
    assert term is not None and term.taxonomy_id == "recTax0000000001"
    assert dataset.skipped() == {}


def test_models_also_take_app_names():
    service = ServiceResponse(id="rec1", name="S", need_focus=["Food"])
    assert service.need_focus == ["Food"]


def test_skipped_records_by_table():
    dataset = Dataset.from_pull({"services": [{"id": "recNoName00000001", "fields": {}}]})

    assert dataset.skipped() == {"services": [("recNoName00000001", "name: missing")]}
