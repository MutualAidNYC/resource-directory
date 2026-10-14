"""The files the build writes under api/, which the API serves.

- One file per record: `api/<table>/<id>.json` for services, organizations,
  service_at_locations, taxonomies and taxonomy_terms (fully nested, as HSDS
  returns them from `/<table>/{id}`).
- One list per table: `api/<table>.json`, every record, unpaginated. The API
  pages and filters it.
- The full download: `api/download.json`, every published record in one file.

Everything comes from `Published` (see application_layer/publish.py). Fields
with no value are left out, never written as null: HSDS types them as strings,
numbers or objects, so null fails the schema. That includes `organization_id`
on a service with no published organization.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from application_layer.organizations import list_organizations, organization_detail
from application_layer.publish import Published
from application_layer.services import list_services, service_detail
from application_layer.taxonomies import Terms, list_taxonomies, list_taxonomy_terms
from data_layer.dataset import Dataset
from models.hsds import HSDS_VERSION

@dataclass(frozen=True)
class ApiFile:
    path: str  # relative to the output directory, e.g. "api/services/<id>.json"
    data: Any  # ready for json.dump
    # Record files only: the HSDS schema it follows, as a path under schemas/hsds/<version>/
    # (see static_build/fetch_schemas.py). None for lists and the download: not checked.
    schema: str | None = None


def api_files(
    dataset: Dataset, published: Published, terms: Terms, built_at: str
) -> list[ApiFile]:
    """Every file under api/. `built_at` (ISO 8601) goes in the full download."""
    services = [service_detail(s, dataset, published, terms) for s in published.services]
    organizations = [organization_detail(o, dataset) for o in published.organizations.values()]
    places = [sal for s in services for sal in s.service_at_locations or []]
    taxonomies = list_taxonomies(published, terms)
    taxonomy_terms = list_taxonomy_terms(published, terms)

    download = {
        "hsds_version": HSDS_VERSION,
        "built_at": built_at,
        "services": _dump_all(services),
        "organizations": _dump_all(organizations),
        "taxonomies": _dump_all(taxonomies),
        "taxonomy_terms": _dump_all(taxonomy_terms),
    }
    return [
        ApiFile("api/services.json", _dump_all(list_services(published))),
        *_one_per_record("services", services, "compiled/service.json"),
        ApiFile("api/organizations.json", _dump_all(list_organizations(published))),
        *_one_per_record("organizations", organizations, "compiled/organization.json"),
        # List items name their location by location_id instead of nesting it.
        ApiFile(
            "api/service_at_locations.json", [_dump(sal, exclude={"location"}) for sal in places]
        ),
        *_one_per_record("service_at_locations", places, "compiled/service_at_location.json"),
        ApiFile("api/taxonomies.json", _dump_all(taxonomies)),
        *_one_per_record("taxonomies", taxonomies, "taxonomy.json"),
        ApiFile("api/taxonomy_terms.json", _dump_all(taxonomy_terms)),
        *_one_per_record("taxonomy_terms", taxonomy_terms, "taxonomy_term.json"),
        ApiFile("api/download.json", download),
    ]


def _one_per_record(folder: str, records: list[Any], schema: str) -> list[ApiFile]:
    return [ApiFile(f"api/{folder}/{r.id}.json", _dump(r), schema) for r in records]


def _dump(model: BaseModel, exclude: set[str] | None = None) -> dict[str, Any]:
    return model.model_dump(mode="json", exclude_none=True, exclude=exclude)


def _dump_all(models: list[Any]) -> list[dict[str, Any]]:
    return [_dump(m) for m in models]
