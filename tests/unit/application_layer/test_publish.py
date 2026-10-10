import pytest

from application_layer.publish import Published
from tests.unit.application_layer.sample_pull import (
    FRIDGE,
    HOTLINE,
    ORG,
    ORPHAN,
    QUIET_ORG,
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


def test_services_of_organization(published: Published):
    assert [s.id for s in published.services_of(ORG)] == [FRIDGE, HOTLINE]
    assert published.services_of(QUIET_ORG) == []
