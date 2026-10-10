import pytest

from application_layer.publish import Published, select
from application_layer.services import list_services
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HOTLINE,
    ORG,
    ORPHAN,
    QUIET_ORG,
    SKIPPED_ORG,
    edit,
    pull,
)

pytestmark = pytest.mark.unit


def test_publishes_pulled_services_in_pull_order(published: Published):
    assert [s.id for s in published.services] == [FRIDGE, HOTLINE, ORPHAN]


def test_organizations_only_with_published_services(published: Published):
    assert list(published.organizations) == [ORG]
    assert QUIET_ORG not in published.organizations
    assert published.service_counts == {ORG: 2}


def test_service_whose_organization_was_skipped_is_reported(published: Published):
    assert published.without_organization == [ORPHAN]
    assert ORPHAN not in published.organization_of


def test_service_linked_to_two_organizations_belongs_to_the_first_in_its_list():
    # QUIET_ORG comes first in the pull, but the service lists ORG first.
    raw = pull()
    edit(raw, FRIDGE, organizations=[ORG, QUIET_ORG])
    dataset = Dataset.from_pull(raw)

    published = select(dataset)

    assert published.organization_of[FRIDGE] == ORG
    assert published.service_counts == {ORG: 2}  # QUIET_ORG doesn't count it
    assert QUIET_ORG not in published.organizations  # so it has no published service
    fridge = list_services(published)[0]
    assert fridge.organization_id == hsds_id("organizations", ORG)


def test_skipped_organization_is_passed_over_for_the_next_one():
    raw = pull()
    edit(raw, FRIDGE, organizations=[SKIPPED_ORG, ORG])
    dataset = Dataset.from_pull(raw)

    published = select(dataset)

    assert published.organization_of[FRIDGE] == ORG
    assert published.without_organization == [ORPHAN]


def test_services_of_organization(published: Published):
    assert [s.id for s in published.services_of(ORG)] == [FRIDGE, HOTLINE]
    assert published.services_of(QUIET_ORG) == []
