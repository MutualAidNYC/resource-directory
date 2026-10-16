"""What the API's list routes (worker/) serve from memory: worker-data/data.json.

Built into the list routes' code when it's deployed, never served as a file:
- `info`: the `/api` response. The routes add `openapi_url` from the request.
- `services`, `organizations`, `service_at_locations`, `taxonomies`, `taxonomy_terms`:
  every published record as an HSDS list item, unpaginated. The routes page and
  filter them.
- `service_terms`: each service's taxonomy term ids, for the taxonomy filters.
- `service_search`: each service's fields from the site's map data, so API search
  finds what the site's search finds.
"""
from __future__ import annotations

from typing import Any

from application_layer.map import MapData
from application_layer.organizations import list_organizations
from application_layer.publish import Published
from application_layer.services import list_services, service_detail
from application_layer.taxonomies import (
    Terms,
    list_taxonomies,
    list_taxonomy_terms,
    service_attributes,
)
from data_layer.dataset import Dataset
from data_layer.ids import hsds_id
from models.hsds import HSDS_VERSION
from static_build.files import dump, dump_all

INFO = {
    "version": HSDS_VERSION,
    "description": "Mutual Aid NYC's resource directory as an HSDS API.",
    "publisher": {"name": "Mutual Aid NYC", "website": "https://mutualaid.nyc"},
}
SEARCH_FIELDS = {
    "id",
    "name",
    "description",
    "address",
    "needFocus",
    "communityFocus",
    "organization_name",
    "service_areas",
}


def worker_data(
    dataset: Dataset, published: Published, terms: Terms, map_data: MapData
) -> dict[str, Any]:
    details = [service_detail(s, dataset, published, terms) for s in published.services]
    places = [sal for s in details for sal in s.service_at_locations or []]
    return {
        "info": INFO,
        "services": dump_all(list_services(published)),
        "organizations": dump_all(list_organizations(published)),
        # List items name their location by location_id instead of nesting it.
        "service_at_locations": [dump(sal, exclude={"location"}) for sal in places],
        "taxonomies": dump_all(list_taxonomies(published, terms)),
        "taxonomy_terms": dump_all(list_taxonomy_terms(published, terms)),
        "service_terms": {
            hsds_id("services", s.id): [a.taxonomy_term_id for a in service_attributes(s, terms)]
            for s in published.services
        },
        "service_search": [
            s.model_dump(mode="json", include=SEARCH_FIELDS, exclude_none=True)
            for s in map_data.services
        ],
    }
