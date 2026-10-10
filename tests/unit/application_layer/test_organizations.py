import pytest

from application_layer.organizations import (
    list_organizations,
    organization_detail,
    organization_services,
)
from application_layer.publish import Published, select
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from tests.unit.application_layer.sample_pull import (
    ADDRESS,
    FRIDGE,
    HALL,
    HOTLINE,
    ORG,
    PHONE_ORG,
    QUIET_ORG,
    pull,
    rec,
    record_ids_in,
)

pytestmark = pytest.mark.unit


def test_list_has_only_organizations_with_published_services(published: Published):
    organizations = list_organizations(published)

    assert [o.id for o in organizations] == [hsds_id("organizations", ORG)]
    assert organizations[0].service_count == 2
    assert hsds_id("organizations", QUIET_ORG) not in [o.id for o in organizations]


def test_list_sorts_by_name_ignoring_case():
    raw = pull()
    raw["organizations"].append(rec("recOrgB0000000001", name="Bees"))
    raw["services"].append(
        rec("recBees0000000001", name="Hive", organizations=["recOrgB0000000001"])
    )
    published = select(Dataset.from_pull(raw))

    assert [o.name for o in list_organizations(published)] == ["Bees", "org A"]


def test_detail(dataset: Dataset, published: Published):
    organization = published.organizations[ORG]

    out = organization_detail(organization, dataset)

    assert out.id == hsds_id("organizations", ORG)
    assert out.website == "https://org.example.org"
    assert out.phones is not None
    assert [p.id for p in out.phones] == [hsds_id("phones", PHONE_ORG)]
    assert out.locations is not None
    [location] = out.locations
    assert location.id == hsds_id("locations", HALL)
    assert location.addresses is not None
    assert [a.id for a in location.addresses] == [hsds_id("addresses", ADDRESS)]
    assert record_ids_in(out.model_dump()) == []


def test_organization_services(published: Published):
    services = organization_services(ORG, published)

    assert [s.id for s in services] == [hsds_id("services", FRIDGE), hsds_id("services", HOTLINE)]
    assert {s.organization_id for s in services} == {hsds_id("organizations", ORG)}


def test_unpublished_organization_has_no_services(published: Published):
    assert organization_services(QUIET_ORG, published) == []
