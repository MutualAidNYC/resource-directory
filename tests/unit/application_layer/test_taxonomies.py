import pytest

from application_layer.publish import Published
from application_layer.taxonomies import (
    Terms,
    list_taxonomies,
    list_taxonomy_terms,
    service_attributes,
    unmatched_categories,
)
from data_layer.dataset import Dataset
from data_layer.ids import attribute_id, hsds_id
from tests.unit.application_layer.sample_pull import (
    COMMUNITY,
    FOOD,
    FRIDGE,
    HOTLINE,
    NEED,
    SENIORS,
    pull,
)

pytestmark = pytest.mark.unit


def test_attributes_match_category_names_to_terms(dataset: Dataset, terms: Terms):
    fridge = dataset.services.get(FRIDGE)
    assert fridge is not None

    attributes = service_attributes(fridge, terms)

    assert [a.taxonomy_term_id for a in attributes] == [
        hsds_id("taxonomy_terms", FOOD),
        hsds_id("taxonomy_terms", SENIORS),
    ]
    assert attributes[0].id == attribute_id(FRIDGE, FOOD)
    assert {a.link_id for a in attributes} == {hsds_id("services", FRIDGE)}
    assert {a.link_entity for a in attributes} == {"service"}


def test_not_listed_is_not_a_category(dataset: Dataset, terms: Terms):
    fridge = dataset.services.get(FRIDGE)
    assert fridge is not None
    assert "-Not Listed" not in [t.name for t in terms.of(fridge)]


def test_unknown_category_names_are_reported(published: Published, terms: Terms):
    assert unmatched_categories(published, terms) == {HOTLINE: ["Mystery"]}


def test_term_must_be_in_the_fields_taxonomy():
    # "Food" as a community focus doesn't match the Need term.
    raw = pull()
    for service in raw["services"]:
        if service["id"] == FRIDGE:
            service["fields"].update(needFocus=[], communityFocus=["Food"])
    dataset = Dataset.from_pull(raw)

    fridge = dataset.services.get(FRIDGE)
    assert fridge is not None
    assert Terms.from_dataset(dataset).of(fridge) == []


def test_only_used_terms_are_published(published: Published, terms: Terms):
    listed = list_taxonomy_terms(published, terms)

    assert [t.name for t in listed] == ["Food", "Seniors"]
    assert listed[0].taxonomy == "MANYC Need"
    assert listed[0].taxonomy_id == hsds_id("taxonomies", NEED)
    assert listed[0].taxonomy_detail is not None
    assert listed[0].taxonomy_detail.id == hsds_id("taxonomies", NEED)


def test_only_taxonomies_with_used_terms(published: Published, terms: Terms):
    assert [t.id for t in list_taxonomies(published, terms)] == [
        hsds_id("taxonomies", NEED),
        hsds_id("taxonomies", COMMUNITY),
    ]
