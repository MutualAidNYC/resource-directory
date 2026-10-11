"""The schema check, against the vendored HSDS schemas (python -m static_build.fetch_schemas)."""
import json
from pathlib import Path

import pytest

from data_layer.ids import hsds_id
from static_build.files import ApiFile
from static_build.schema import SchemaProblem, SchemasNotInstalled, schema_problems
from tests.unit.application_layer.sample_pull import ADDRESS, COMMUNITY, FOOD, FRIDGE, edit, pull
from tests.unit.static_build.sample_build import Pull, complete_pull, files_for

pytestmark = pytest.mark.unit


def problems_in(raw: Pull) -> list[SchemaProblem]:
    return schema_problems(files_for(raw).values())


def test_complete_sample_follows_hsds():
    assert problems_in(complete_pull()) == []


def test_each_problem_names_its_record_once():
    problems = problems_in(pull())
    food = hsds_id("taxonomy_terms", FOOD)
    community = hsds_id("taxonomies", COMMUNITY)

    assert SchemaProblem(food, "Food", "missing description") in problems
    # The taxonomy is in its own file and inside its term's file: reported once.
    assert [p for p in problems if p.record_id == community] == [
        SchemaProblem(community, "MANYC Community Focus", "missing description")
    ]


def test_a_record_without_a_name_is_named_by_the_record_around_it():
    raw = complete_pull()
    edit(raw, ADDRESS, postal_code=None)

    # The address shows in the service's, the service_at_location's and the
    # organization's files; it's reported once, as the address to fix.
    assert problems_in(raw) == [
        SchemaProblem(hsds_id("addresses", ADDRESS), "in Community Hall", "missing postal_code")
    ]


def test_problems_say_what_is_wrong_without_the_value():
    raw = complete_pull()
    edit(raw, FRIDGE, email="not-an-email", url="fridge.example.org")
    fridge = hsds_id("services", FRIDGE)

    problems = problems_in(raw)

    assert set(problems) == {
        SchemaProblem(fridge, "Fridge", "email is not an email address"),
        SchemaProblem(
            fridge, "Fridge", "url is not a full web address (it should start with https://)"
        ),
    }
    assert not any("not-an-email" in str(p) or "fridge.example" in str(p) for p in problems)


def write_schema(folder: Path, name: str, schema: dict) -> None:
    path = folder / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(schema), encoding="utf-8")


def test_refs_between_schemas_resolve_and_files_without_a_schema_are_skipped(tmp_path: Path):
    write_schema(tmp_path, "thing.json", {"properties": {"part": {"$ref": "part.json"}}})
    write_schema(tmp_path, "part.json", {"type": "object", "required": ["size"]})
    write_schema(tmp_path, "compiled/whole.json", {"type": "object", "required": ["size"]})
    files = [
        ApiFile("api/things/a.json", {"id": "a", "name": "A", "part": {"id": "p"}}, "thing.json"),
        ApiFile("api/wholes/b.json", {"id": "b"}, "compiled/whole.json"),
        ApiFile("api/things.json", [{}]),  # no schema: not checked
    ]

    assert schema_problems(files, tmp_path) == [
        SchemaProblem("p", "in A", "missing size"),
        SchemaProblem("b", "", "missing size"),
    ]


def test_missing_schemas_say_how_to_fetch_them(tmp_path: Path):
    with pytest.raises(SchemasNotInstalled, match="static_build.fetch_schemas"):
        schema_problems([], tmp_path)
