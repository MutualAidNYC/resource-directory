import uuid

import pytest

from data_layer.ids import NAMESPACE, attribute_id, hsds_id

def test_namespace_is_fixed():
    # Changing this changes every published id and URL.
    assert str(NAMESPACE) == "391e915f-a3b0-4edb-9fde-e6310dd1441b"


def test_hsds_id_is_stable():
    # Pinned output: if this fails, published ids have changed.
    assert hsds_id("services", "recTa2S4B7dP40wEc") == "35e4e3db-4329-5e42-9c94-c89928210ecc"


def test_hsds_id_is_uuid5():
    value = uuid.UUID(hsds_id("services", "recTa2S4B7dP40wEc"))
    assert value.version == 5


def test_same_record_id_in_two_tables_gives_different_ids():
    assert hsds_id("services", "recAAAAAAAAAAAAAA") != hsds_id(
        "organizations", "recAAAAAAAAAAAAAA"
    )


def test_attribute_id_depends_on_both_records():
    a = attribute_id("recService0000001", "recTerm000000001")
    assert a != attribute_id("recService0000001", "recTerm000000002")
    assert a != attribute_id("recService0000002", "recTerm000000001")
    assert a != hsds_id("attributes", "recService0000001")


@pytest.mark.parametrize("table,record_id", [("", "rec1"), ("services", "")])
def test_hsds_id_rejects_empty(table: str, record_id: str):
    with pytest.raises(ValueError):
        hsds_id(table, record_id)


@pytest.mark.parametrize("service,term", [("", "rec1"), ("rec1", "")])
def test_attribute_id_rejects_empty(service: str, term: str):
    with pytest.raises(ValueError):
        attribute_id(service, term)
