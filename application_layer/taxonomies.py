"""Categories as HSDS taxonomy terms and attributes.

Services hold their categories as plain names (`needFocus`, `communityFocus`
in Airtable). Each name is matched exactly to a term in the "MANYC Need" or
"MANYC Community Focus" taxonomy and published as an HSDS attribute.

Only terms used by published services are published. Ids here are Airtable
record ids; public ids are made at output time (data_layer/ids.py).
"""
from __future__ import annotations

from dataclasses import dataclass

from application_layer.publish import Published
from data_layer.dataset import Dataset
from data_layer.ids import attribute_id, hsds_id
from models.airtable import ServiceResponse, TaxonomyResponse, TaxonomyTermResponse
from models.hsds import Attribute, Taxonomy, TaxonomyTerm

# Service field → taxonomy whose terms its values name.
CATEGORY_TAXONOMIES = {
    "need_focus": "MANYC Need",
    "community_focus": "MANYC Community Focus",
}
NOT_LISTED = "-Not Listed"  # placeholder choice, not a category


@dataclass(frozen=True)
class Terms:
    """Taxonomy terms by (taxonomy name, term name)."""

    by_name: dict[tuple[str, str], TaxonomyTermResponse]
    taxonomies: dict[str, TaxonomyResponse]  # record id → taxonomy

    @classmethod
    def from_dataset(cls, dataset: Dataset) -> Terms:
        taxonomies = {t.id: t for t in dataset.taxonomies.list()}
        by_name = {}
        for term in dataset.taxonomy_terms.list():
            taxonomy = taxonomies.get(term.taxonomy_id or "")
            if taxonomy:
                by_name[(taxonomy.name, term.name)] = term
        return cls(by_name, taxonomies)

    def of(self, service: ServiceResponse) -> list[TaxonomyTermResponse]:
        """The service's category terms, in field then value order."""
        return self.unmatched_and_matched(service)[1]

    def unmatched_and_matched(
        self, service: ServiceResponse
    ) -> tuple[list[str], list[TaxonomyTermResponse]]:
        """(category names with no term, matching terms) for one service."""
        unmatched: list[str] = []
        matched: list[TaxonomyTermResponse] = []
        for field, taxonomy in CATEGORY_TAXONOMIES.items():
            for name in getattr(service, field) or []:
                if name == NOT_LISTED:
                    continue
                term = self.by_name.get((taxonomy, name))
                if term is None:
                    unmatched.append(name)
                elif term not in matched:
                    matched.append(term)
        return unmatched, matched


def service_attributes(service: ServiceResponse, terms: Terms) -> list[Attribute]:
    """HSDS attributes linking the service to its category terms."""
    return [
        Attribute(
            id=attribute_id(service.id, term.id),
            link_id=hsds_id("services", service.id),
            link_entity="service",
            taxonomy_term_id=hsds_id("taxonomy_terms", term.id),
        )
        for term in terms.of(service)
    ]


def unmatched_categories(published: Published, terms: Terms) -> dict[str, list[str]]:
    """Category names with no matching term, by service record id (build report)."""
    report = {}
    for service in published.services:
        unmatched = terms.unmatched_and_matched(service)[0]
        if unmatched:
            report[service.id] = unmatched
    return report


def list_taxonomy_terms(published: Published, terms: Terms) -> list[TaxonomyTerm]:
    """Terms used by at least one published service, in pull order."""
    used = {t.id for s in published.services for t in terms.of(s)}
    out = []
    for (taxonomy_name, _), term in terms.by_name.items():
        if term.id not in used:
            continue
        taxonomy = terms.taxonomies[term.taxonomy_id or ""]
        out.append(
            TaxonomyTerm(
                id=hsds_id("taxonomy_terms", term.id),
                name=term.name,
                description=term.description,
                taxonomy=taxonomy_name,
                taxonomy_id=hsds_id("taxonomies", taxonomy.id),
                taxonomy_detail=_taxonomy(taxonomy),
            )
        )
    return out


def list_taxonomies(published: Published, terms: Terms) -> list[Taxonomy]:
    """Taxonomies with at least one published term."""
    used = {t.taxonomy_id for s in published.services for t in terms.of(s)}
    return [_taxonomy(t) for t in terms.taxonomies.values() if t.id in used]


def _taxonomy(taxonomy: TaxonomyResponse) -> Taxonomy:
    return Taxonomy(
        id=hsds_id("taxonomies", taxonomy.id),
        name=taxonomy.name,
        description=taxonomy.description,
    )
