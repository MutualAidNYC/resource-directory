"""Reads the real base with airtable.toml (or AIRTABLE_CONFIG). Needs AIRTABLE_API_KEY
and AIRTABLE_BASE_ID (from .env); skipped otherwise.

Run: pytest -m integration tests/integration/data_layer/test_loader_live.py
"""
import pytest
from pydantic import ValidationError

from config import Settings, get_settings
from data_layer.airtable_config import load_config
from data_layer.loader import load_tables

pytestmark = pytest.mark.integration


@pytest.fixture
def settings() -> Settings:
    try:
        return get_settings()
    except ValidationError:
        pytest.skip("AIRTABLE_API_KEY / AIRTABLE_BASE_ID not set")


def test_loads_service_areas(settings: Settings):
    config = load_config(settings.airtable_config)

    result = load_tables(
        settings.airtable_api_key, settings.airtable_base_id, config, ["service_areas"]
    )

    rows = result["service_areas"]
    assert rows
    assert all(r["id"].startswith("rec") for r in rows)
    assert any(r["fields"].get("name") for r in rows)


def test_full_pull(settings: Settings):
    """Airtable rejects unknown field names (422), so this catches typos in
    airtable.toml and bad filter formulas. Pulls every configured table."""
    config = load_config(settings.airtable_config)

    result = load_tables(settings.airtable_api_key, settings.airtable_base_id, config)

    assert set(result) == set(config.tables)
