"""Services: the list and each service's detail.

Built only from `Published` (see publish.py). Ids passed in are Airtable record
ids; public ids are made here with data_layer.ids.hsds_id.
"""
from __future__ import annotations

from application_layer import records
from application_layer.publish import Published
from application_layer.taxonomies import Terms, service_attributes
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import ServiceResponse
from models.hsds import Service, ServiceAtLocation, ServiceSummary

STATUS = "active"  # every published service; HSDS: active, inactive, defunct, …


def service_summary(service: ServiceResponse, published: Published) -> ServiceSummary:
    """A service in a list (all services, or one organization's)."""
    return ServiceSummary(
        id=hsds_id("services", service.id),
        organization_id=_organization_id(service, published),
        name=service.name,
        status=STATUS,
        description=service.description,
        url=service.url,
        email=service.email,
        need_focus=service.need_focus,
        community_focus=service.community_focus,
    )


def list_services(published: Published) -> list[ServiceSummary]:
    """All published services, sorted by name ignoring case."""
    services = sorted(published.services, key=lambda s: s.name.lower())
    return [service_summary(s, published) for s in services]


def service_detail(
    service: ServiceResponse, dataset: Dataset, published: Published, terms: Terms
) -> Service:
    """One service with its phones, languages, locations and categories."""
    organization = published.organizations.get(published.organization_of.get(service.id, ""))
    return Service(
        id=hsds_id("services", service.id),
        organization_id=_organization_id(service, published),
        name=service.name,
        status=STATUS,
        description=service.description,
        url=service.url,
        email=service.email,
        assured_date=service.assured_date,
        phones=records.phones(dataset, service.phones),
        languages=records.languages(dataset, service.languages),
        service_at_locations=_service_at_locations(service, dataset),
        attributes=service_attributes(service, terms),
        group_name=organization.name if organization else None,
        need_focus=service.need_focus,
        community_focus=service.community_focus,
    )


def _organization_id(service: ServiceResponse, published: Published) -> str | None:
    organization_id = published.organization_of.get(service.id)
    return hsds_id("organizations", organization_id) if organization_id else None


def _service_at_locations(service: ServiceResponse, dataset: Dataset) -> list[ServiceAtLocation]:
    """Where the service is offered. Many services have none on purpose
    (hotlines, citywide); they never inherit their organization's address."""
    out = []
    for sal in dataset.service_at_location.list():
        if sal.service_id != service.id:
            continue
        place = dataset.locations.get((sal.locations or [""])[0])
        out.append(
            ServiceAtLocation(
                id=hsds_id("service_at_location", sal.id),
                service_id=hsds_id("services", service.id),
                location=records.location(dataset, place) if place else None,
            )
        )
    return out
