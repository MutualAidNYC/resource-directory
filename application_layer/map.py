"""The map page's data: every published service with a pin, plus filter values.

The site's own shape, not HSDS: categories stay plain name lists. Coordinates
come only from locations linked through service_at_location; a service with
none gets no pin (never its organization's address). Ids passed in are Airtable record
ids; public ids are made here with data_layer.ids.hsds_id.
"""
from __future__ import annotations

from collections.abc import Callable

from pydantic import BaseModel

from application_layer.publish import Published
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import ServiceAreaResponse, ServiceResponse
from utils.address import format_address

class MapService(BaseModel):
    id: str
    name: str
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    url: str | None = None
    needFocus: list[str] = []
    communityFocus: list[str] = []
    latitude: float | None = None
    longitude: float | None = None
    organization_name: str | None = None
    service_areas: list[str] = []


class Category(BaseModel):
    """A filter value. Icons are looked up by name in the frontend."""
    name: str


class MapData(BaseModel):
    services: list[MapService]
    needCategories: list[Category]
    communityCategories: list[Category]
    serviceAreas: list[str]


AreaOrder = Callable[[str], tuple[int, float, str]]


def map_data(dataset: Dataset, published: Published) -> MapData:
    """Published services in pull order, and the values the map filters on."""
    areas = {a.id: a for a in dataset.service_areas.list() if a.name}
    orders = {a.name: a.order for a in areas.values()}

    def area_order(name: str) -> tuple[int, float, str]:
        # Airtable's x-order first; areas without one after, by name.
        order = orders.get(name)
        return (0, order, name) if order is not None else (1, 0.0, name)

    services = [_map_service(s, dataset, published, areas, area_order) for s in published.services]
    needs = {n for s in services for n in s.needFocus}
    communities = {c for s in services for c in s.communityFocus}
    area_names = {a for s in services for a in s.service_areas}
    return MapData(
        services=services,
        needCategories=[Category(name=n) for n in sorted(needs)],
        communityCategories=[Category(name=c) for c in sorted(communities)],
        serviceAreas=sorted(area_names, key=area_order),
    )


def _map_service(
    service: ServiceResponse,
    dataset: Dataset,
    published: Published,
    areas: dict[str, ServiceAreaResponse],
    area_order: AreaOrder,
) -> MapService:
    latitude = longitude = address = None
    for sal in dataset.service_at_location.list():
        if sal.service_id != service.id:
            continue
        for place in dataset.locations.get_bulk(sal.locations or []):
            found = dataset.addresses.get_bulk(place.addresses or [])
            text = (format_address(found[0].model_dump()) if found else None) or place.name
            if address is None and text:
                address = text  # keep an address even without coordinates
            if place.latitude is not None and place.longitude is not None:
                latitude, longitude, address = place.latitude, place.longitude, text
                break
        if latitude is not None:
            break

    phone = next((p.number for p in dataset.phones.get_bulk(service.phones or [])), None)
    organization = published.organizations.get(published.organization_of.get(service.id, ""))
    names = [str(areas[a].name) for a in service.service_areas or [] if a in areas]
    return MapService(
        id=hsds_id("services", service.id),
        name=service.name,
        description=service.description,
        address=address,
        phone=phone,
        url=service.url,
        needFocus=service.need_focus or [],
        communityFocus=service.community_focus or [],
        latitude=latitude,
        longitude=longitude,
        organization_name=organization.name if organization else None,
        service_areas=sorted(names, key=area_order),
    )
