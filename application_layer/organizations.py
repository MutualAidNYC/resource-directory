"""Organizations: the list and each organization's detail.

An organization appears only if it has at least one published service (see
publish.py).
"""

from __future__ import annotations

from application_layer import records
from application_layer.publish import Published
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import OrganizationResponse
from models.hsds import Organization, OrganizationSummary


def list_organizations(published: Published) -> list[OrganizationSummary]:
    """Published organizations, sorted by name ignoring case."""
    organizations = sorted(published.organizations.values(), key=lambda o: o.name.lower())
    return [
        OrganizationSummary(
            id=hsds_id("organizations", o.id),
            name=o.name,
            description=o.description,
            email=o.email,
            website=o.website,
        )
        for o in organizations
    ]


def organization_detail(organization: OrganizationResponse, dataset: Dataset) -> Organization:
    """One organization with its phones and locations."""
    return Organization(
        id=hsds_id("organizations", organization.id),
        name=organization.name,
        description=organization.description,
        email=organization.email,
        website=organization.website,
        phones=records.phones(dataset, organization.phones),
        locations=[
            records.location(dataset, place)
            for place in dataset.locations.get_bulk(organization.locations or [])
        ],
    )
