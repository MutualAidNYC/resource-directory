import pytest

from application_layer.publish import Published
from application_layer.services import list_services, service_detail
from application_layer.taxonomies import Terms
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.hsds import Service
from tests.unit.application_layer.sample_pull import (
    ADDRESS,
    FRIDGE,
    HALL,
    HOTLINE,
    ORG,
    ORPHAN,
    PHONE_FRIDGE,
    SAL_FRIDGE,
    SAL_HOTLINE,
    SPANISH,
    record_ids_in,
)

pytestmark = pytest.mark.unit


def detail(service_id: str, dataset: Dataset, published: Published, terms: Terms) -> Service:
    service = dataset.services.get(service_id)
    assert service is not None
    return service_detail(service, dataset, published, terms)


def test_list_is_sorted_by_name(published: Published):
    assert [s.name for s in list_services(published)] == ["Fridge", "Hotline", "Orphan"]


def test_list_item(published: Published):
    fridge = list_services(published)[0]

    assert fridge.id == hsds_id("services", FRIDGE)
    assert fridge.organization_id == hsds_id("organizations", ORG)
    assert fridge.status == "active"
    assert fridge.need_focus == ["Food", "-Not Listed"]
    assert fridge.community_focus == ["Seniors"]


def test_list_item_without_categories_or_organization(published: Published):
    orphan = list_services(published)[2]

    assert orphan.community_focus is None
    assert orphan.organization_id is None  # its organization isn't published


def test_detail(dataset: Dataset, published: Published, terms: Terms):
    fridge = detail(FRIDGE, dataset, published, terms)

    assert fridge.status == "active"
    assert fridge.group_name == "org A"
    assert fridge.email == "fridge@example.org"
    assert fridge.assured_date == "2026-01-02"
    assert fridge.languages is not None
    assert [(lang.id, lang.code) for lang in fridge.languages] == [
        (hsds_id("languages", SPANISH), "es")
    ]
    assert fridge.attributes is not None and len(fridge.attributes) == 2


def test_detail_skips_deleted_links(dataset: Dataset, published: Published, terms: Terms):
    fridge = detail(FRIDGE, dataset, published, terms)

    assert fridge.phones is not None
    assert [p.id for p in fridge.phones] == [hsds_id("phones", PHONE_FRIDGE)]


def test_detail_location(dataset: Dataset, published: Published, terms: Terms):
    fridge = detail(FRIDGE, dataset, published, terms)

    assert fridge.service_at_locations is not None
    [sal] = fridge.service_at_locations
    assert sal.id == hsds_id("service_at_location", SAL_FRIDGE)
    assert sal.service_id == fridge.id
    assert sal.location is not None
    assert sal.location.id == hsds_id("locations", HALL)
    assert sal.location.location_type == "physical"
    assert sal.location.addresses is not None
    [address] = sal.location.addresses
    assert (address.id, address.address_type) == (hsds_id("addresses", ADDRESS), "physical")


def test_detail_without_location_stays_without(
    dataset: Dataset, published: Published, terms: Terms
):
    hotline = detail(HOTLINE, dataset, published, terms)

    assert hotline.service_at_locations is not None
    [sal] = hotline.service_at_locations
    assert sal.id == hsds_id("service_at_location", SAL_HOTLINE)
    assert sal.location is None  # never the organization's address


def test_detail_without_published_organization(
    dataset: Dataset, published: Published, terms: Terms
):
    orphan = detail(ORPHAN, dataset, published, terms)

    assert orphan.organization_id is None
    assert orphan.group_name is None


def test_outputs_have_no_airtable_ids(dataset: Dataset, published: Published, terms: Terms):
    for service in published.services:
        dumped = service_detail(service, dataset, published, terms).model_dump()
        assert record_ids_in(dumped) == []
    assert record_ids_in([s.model_dump() for s in list_services(published)]) == []


def test_detail_has_no_private_fields(dataset: Dataset, published: Published, terms: Terms):
    dumped = detail(FRIDGE, dataset, published, terms).model_dump(exclude_none=False)

    assert "contacts" not in dumped
    assert "assurer_email" not in dumped
