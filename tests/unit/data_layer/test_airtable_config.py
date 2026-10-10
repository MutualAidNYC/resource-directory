from pathlib import Path

import pytest

from data_layer.airtable_config import (
    DEFAULT_PATH,
    REPO_ROOT,
    AirtableConfigError,
    load_config,
    parse_config,
)

pytestmark = pytest.mark.unit


# The shipped config (Mutual Aid NYC's base)

def test_shipped_config_loads():
    config = load_config(DEFAULT_PATH)
    assert "services" in config.tables


@pytest.mark.parametrize("field", ["Submitter: Email", "Notes", "[INT] MANYC Notes"])
def test_shipped_skips_private_fields(field: str):
    config = load_config(DEFAULT_PATH)
    assert all(field not in t.fields for t in config.tables.values())


def test_shipped_services_filter_on_status():
    # The publish guard: the build publishes every service it pulls.
    config = load_config(DEFAULT_PATH)
    assert config.tables["services"].filter == "{status} = 'Published'"


# Loading

def test_relative_path_from_repo_root(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir("/")
    config = load_config("airtable.toml")
    assert config == load_config(REPO_ROOT / "airtable.toml")


def test_missing_file(tmp_path: Path):
    with pytest.raises(AirtableConfigError, match="not found"):
        load_config(tmp_path / "nope.toml")


def test_malformed_toml(tmp_path: Path):
    path = tmp_path / "bad.toml"
    path.write_text("[tables.languages\n")
    with pytest.raises(AirtableConfigError, match="bad.toml"):
        load_config(path)


# Table settings

def test_ref_defaults_to_name():
    config = parse_config({"tables": {"languages": {"fields": ["name"]}}})
    assert config.tables["languages"].ref == "languages"


def test_ref_prefers_id():
    config = parse_config({"tables": {"services": {"id": "tblAAAAAAAAAAAAAA", "fields": ["name"]}}})
    assert config.tables["services"].ref == "tblAAAAAAAAAAAAAA"


@pytest.mark.parametrize(
    "raw,message",
    [
        ({"tables": {"services": {"fields": ["name", "name"]}}}, "listed twice: name"),
        ({"tables": {"services": {"fields": ["name", " "]}}}, "can't be blank"),
        ({"tables": {"services": {"fields": ["name"], "filter": " "}}}, "Airtable formula"),
        ({"tables": {"services": {"fields": ["name"], "name": "x"}}}, "name from the section key"),
    ],
)
def test_rejects_bad_settings(raw: dict, message: str):
    with pytest.raises(AirtableConfigError, match=message):
        parse_config(raw)


def test_error_names_the_file(tmp_path: Path):
    path = tmp_path / "mine.toml"
    path.write_text('[tables.languages]\nfields = ["name"]\nfilters = "x"\n')
    with pytest.raises(AirtableConfigError, match=r"mine.toml: \[tables.languages\] filters"):
        load_config(path)


def test_errors_hide_values():
    raw = {"tables": {"services": {"fields": ["name"], "filter": 1, "secret": "s3cret"}}}
    with pytest.raises(AirtableConfigError) as excinfo:
        parse_config(raw)
    assert "s3cret" not in str(excinfo.value)
