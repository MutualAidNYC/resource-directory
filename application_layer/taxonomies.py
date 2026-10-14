"""Categories as HSDS taxonomy terms and attributes.

Services hold their categories as plain names (`needFocus`, `communityFocus`
in Airtable). Each name is matched exactly to a term in the taxonomy that
CATEGORY_TAXONOMIES names for its field and published as an HSDS attribute.
The taxonomy names are Mutual Aid NYC's; for another base, change CATEGORY_TAXONOMIES.
The site shows the same matched terms as plain names (`Terms.names`, used by map.py).

Only terms used by published services are published. Ids here are Airtable
record ids; public ids are made at output time (data_layer/ids.py).
"""
from __future__ import annotations

from collections.abc import Iterator
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
        """The service's category terms, in field then value order, each term once."""
        found: dict[str, TaxonomyTermResponse] = {}
        for _, _, term in self._match(service):
            if term is not None:
                found.setdefault(term.id, term)
        return list(found.values())

    def names(self, service: ServiceResponse) -> dict[str, list[str]]:
        """The service's category names by field (`need_focus`, `community_focus`), for the
        site. Only names that match a term, each once, in value order: "-Not Listed" and
        unmatched names are left out, so the site and the API's attributes always agree."""
        found: dict[str, list[str]] = {field: [] for field in CATEGORY_TAXONOMIES}
        for field, _, term in self._match(service):
            if term is not None and term.name not in found[field]:
                found[field].append(term.name)
        return found

    def unmatched(self, service: ServiceResponse) -> list[str]:
        """The service's category names that match no term (build report)."""
        return [name for _, name, term in self._match(service) if term is None]

    def _match(
        self, service: ServiceResponse
    ) -> Iterator[tuple[str, str, TaxonomyTermResponse | None]]:
        """Each category name on the service with its field and term (None if none matches)."""
        for field, taxonomy in CATEGORY_TAXONOMIES.items():
            for name in getattr(service, field) or []:
                if name != NOT_LISTED:
                    yield field, name, self.by_name.get((taxonomy, name))


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
    report: dict[str, list[str]] = {}
    for service in published.services:
        unmatched = terms.unmatched(service)
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
