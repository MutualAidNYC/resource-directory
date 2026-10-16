"""The files the build writes under api/, which the API serves.

- One file per record: `api/<table>/<id>` for services, organizations,
  service_at_locations, taxonomies and taxonomy_terms (fully nested, as HSDS
  returns them from `/<table>/{id}`).
- The full download: `api/download.json`, every published record in one file.
- The OpenAPI description: `api/openapi.json`, a copy of static_build/openapi.json
  (adapted from HSDS's; edit it by hand when the API's routes or parameters change).

The lists are served by the API's list routes (worker/), from worker-data/data.json
(static_build/worker_data.py).

Everything comes from `Published` (see application_layer/publish.py). Fields
with no value are left out, never written as null: HSDS types them as strings,
numbers or objects, so null fails the schema. That includes `organization_id`
on a service with no published organization.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from application_layer.organizations import organization_detail
from application_layer.publish import Published
from application_layer.services import service_detail
from application_layer.taxonomies import Terms, list_taxonomies, list_taxonomy_terms
from data_layer.dataset import Dataset
from models.hsds import HSDS_VERSION

OPENAPI = Path(__file__).with_name("openapi.json")

@dataclass(frozen=True)
class ApiFile:
    path: str  # relative to the output directory, e.g. "api/services/<id>"
    data: Any  # ready for json.dump
    # Record files only: the HSDS schema it follows, as a path under schemas/hsds/<version>/
    # (see static_build/fetch_schemas.py). None for the download and openapi.json: not checked.
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
        "services": dump_all(services),
        "organizations": dump_all(organizations),
        "taxonomies": dump_all(taxonomies),
        "taxonomy_terms": dump_all(taxonomy_terms),
    }
    return [
        *_one_per_record("services", services, "compiled/service.json"),
        *_one_per_record("organizations", organizations, "compiled/organization.json"),
        *_one_per_record("service_at_locations", places, "compiled/service_at_location.json"),
        *_one_per_record("taxonomies", taxonomies, "taxonomy.json"),
        *_one_per_record("taxonomy_terms", taxonomy_terms, "taxonomy_term.json"),
        ApiFile("api/download.json", download),
        ApiFile("api/openapi.json", json.loads(OPENAPI.read_text(encoding="utf-8"))),
    ]


def _one_per_record(folder: str, records: list[Any], schema: str) -> list[ApiFile]:
    return [ApiFile(f"api/{folder}/{r.id}", dump(r), schema) for r in records]


def dump(model: BaseModel, exclude: set[str] | None = None) -> dict[str, Any]:
    return model.model_dump(mode="json", exclude_none=True, exclude=exclude)


def dump_all(models: list[Any]) -> list[dict[str, Any]]:
    return [dump(m) for m in models]
