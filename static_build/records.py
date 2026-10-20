"""Every published record as HSDS returns it, built once per build.

The API's files (static_build/files.py) and the list routes' data
(static_build/worker_data.py) both read these, so each service's detail is built
once, not once per output.
"""
from __future__ import annotations

from dataclasses import dataclass

from application_layer.organizations import organization_detail
from application_layer.publish import Published
from application_layer.services import service_detail
from application_layer.taxonomies import Terms, list_taxonomies, list_taxonomy_terms
from data_layer.dataset import Dataset
from models.hsds import Organization, Service, ServiceAtLocation, Taxonomy, TaxonomyTerm

@dataclass(frozen=True)
class Records:
    services: list[Service]
    organizations: list[Organization]
    service_at_locations: list[ServiceAtLocation]
    taxonomies: list[Taxonomy]
    taxonomy_terms: list[TaxonomyTerm]

    @classmethod
    def build(cls, dataset: Dataset, published: Published, terms: Terms) -> Records:
        services = [service_detail(s, dataset, published, terms) for s in published.services]
        return cls(
            services=services,
            organizations=[
                organization_detail(o, dataset) for o in published.organizations.values()
            ],
            service_at_locations=[sal for s in services for sal in s.service_at_locations or []],
            taxonomies=list_taxonomies(published, terms),
            taxonomy_terms=list_taxonomy_terms(published, terms),
        )
