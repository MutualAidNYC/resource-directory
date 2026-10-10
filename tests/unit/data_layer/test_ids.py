import uuid

import pytest

from data_layer.airtable_config import DEFAULT_PATH, load_config
from data_layer.ids import NAMESPACE, TABLES, attribute_id, hsds_id

pytestmark = pytest.mark.unit


def test_namespace_is_fixed():
    # Changing this changes every published id and URL.
    assert str(NAMESPACE) == "391e915f-a3b0-4edb-9fde-e6310dd1441b"


def test_hsds_id_is_stable():
    # Pinned output: if this fails, published ids have changed.
    assert hsds_id("services", "recTa2S4B7dP40wEc") == "35e4e3db-4329-5e42-9c94-c89928210ecc"


def test_hsds_id_is_uuid5():
    value = uuid.UUID(hsds_id("services", "recTa2S4B7dP40wEc"))
    assert value.version == 5


def test_hsds_id_differs_by_table():
    assert hsds_id("services", "recAAAAAAAAAAAAAA") != hsds_id(
        "organizations", "recAAAAAAAAAAAAAA"
    )


def test_attribute_id_depends_on_both_records():
    a = attribute_id("recService0000001", "recTerm000000001")
    assert a != attribute_id("recService0000001", "recTerm000000002")
    assert a != attribute_id("recService0000002", "recTerm000000001")


def test_tables_match_airtable_toml():
    # Ids are made from these names, so they must be the config's section keys.
    assert TABLES == set(load_config(DEFAULT_PATH).tables)


@pytest.mark.parametrize("table", ["", "service"])
def test_hsds_id_rejects_unknown_table(table: str):
    with pytest.raises(ValueError, match="unknown table"):
        hsds_id(table, "recAAAAAAAAAAAAAA")  # type: ignore[arg-type]


def test_hsds_id_rejects_empty_record_id():
    with pytest.raises(ValueError, match="record_id"):
        hsds_id("services", "")


@pytest.mark.parametrize("service,term", [("", "rec1"), ("rec1", "")])
def test_attribute_id_rejects_empty(service: str, term: str):
    with pytest.raises(ValueError):
        attribute_id(service, term)
