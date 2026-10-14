"""The site's own data: every published service for the map and search, plus filter values.

Site-only, not HSDS and not part of the API: the build writes it to
site-data/map.json (build_dataset.py). Categories are plain name lists, made from
the matched taxonomy terms (Terms.names), so they always agree with the API's
`attributes`. Coordinates come only from locations linked through
service_at_location; a service with none gets no pin (never its organization's
address). Ids passed in are Airtable record ids; public ids are made here with
data_layer.ids.hsds_id.
"""
from __future__ import annotations

from collections.abc import Callable

from pydantic import BaseModel

from application_layer import records
from application_layer.publish import Published
from application_layer.taxonomies import Terms
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.airtable import LocationResponse, ServiceAreaResponse, ServiceResponse
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


def map_data(dataset: Dataset, published: Published, terms: Terms) -> MapData:
    """Published services in pull order, and the values the map filters on."""
    areas = {a.id: a for a in dataset.service_areas.list() if a.name}
    orders = {a.name: a.order for a in areas.values()}

    def area_order(name: str) -> tuple[int, float, str]:
        # Airtable's x-order first; areas without one after, by name.
        order = orders.get(name)
        return (0, order, name) if order is not None else (1, 0.0, name)

    services = [
        _map_service(s, dataset, published, terms, areas, area_order) for s in published.services
    ]
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
    terms: Terms,
    areas: dict[str, ServiceAreaResponse],
    area_order: AreaOrder,
) -> MapService:
    places = [place for _, place in records.service_places(dataset, service)]
    pin = _first_with_coordinates(places)
    phone = next((p.number for p in dataset.phones.get_bulk(service.phones or [])), None)
    organization = published.organization_for(service)
    names = [str(areas[a].name) for a in service.service_areas or [] if a in areas]
    categories = terms.names(service)
    return MapService(
        id=hsds_id("services", service.id),
        name=service.name,
        description=service.description,
        address=_address(dataset, pin) if pin else None,
        phone=phone,
        url=service.url,
        needFocus=categories["need_focus"],
        communityFocus=categories["community_focus"],
        latitude=pin.latitude if pin else None,
        longitude=pin.longitude if pin else None,
        organization_name=organization.name if organization else None,
        service_areas=sorted(names, key=area_order),
    )


def _first_with_coordinates(places: list[LocationResponse]) -> LocationResponse | None:
    """The location the pin goes on."""
    for place in places:
        if place.has_coordinates:
            return place
    return None


def _address(dataset: Dataset, place: LocationResponse) -> str | None:
    """The place's first address as one line. No address record means no address."""
    found = dataset.addresses.get_bulk(place.addresses or [])
    if not found:
        return None
    return format_address(found[0].model_dump()) or None
