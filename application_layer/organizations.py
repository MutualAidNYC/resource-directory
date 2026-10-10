"""Organizations: the list, each organization's detail and its services.

An organization appears only if it has at least one published service (see
publish.py). Ids passed in are Airtable record ids; public ids are made here
with data_layer.ids.hsds_id.
"""
from __future__ import annotations

from application_layer import records
from application_layer.publish import Published
from application_layer.services import service_summary
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import OrganizationResponse
from models.hsds import Organization, OrganizationListItem, ServiceSummary

def list_organizations(published: Published) -> list[OrganizationListItem]:
    """Published organizations with their service counts, sorted by name ignoring case."""
    organizations = sorted(published.organizations.values(), key=lambda o: o.name.lower())
    return [
        OrganizationListItem(
            id=hsds_id("organizations", o.id),
            name=o.name,
            description=o.description,
            email=o.email,
            website=o.website,
            service_count=published.service_counts[o.id],
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


def organization_services(organization_id: str, published: Published) -> list[ServiceSummary]:
    """The organization's published services, in pull order."""
    return [service_summary(s, published) for s in published.services_of(organization_id)]
