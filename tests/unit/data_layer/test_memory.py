import pytest
from pydantic import BaseModel

from data_layer.data import InMemoryData

pytestmark = pytest.mark.unit


class Thing(BaseModel):
    id: str
    name: str
    status: str | None = None


RECORDS = [
    {"id": "rec1", "fields": {"name": "one", "status": "Published"}},
    {"id": "rec2", "fields": {"name": "two"}},
    {"id": "rec3", "fields": {"name": "three", "status": "Published", "unused": 1}},
]


def table() -> InMemoryData[Thing]:
    return InMemoryData.from_records(Thing, RECORDS)


def test_record_id_is_model_id():
    assert table().get("rec1") == Thing(id="rec1", name="one", status="Published")


def test_record_id_overrides_field():
    t = InMemoryData.from_records(Thing, [{"id": "rec9", "fields": {"id": "other", "name": "n"}}])
    thing = t.get("rec9")
    assert thing is not None
    assert thing.id == "rec9"


def test_get_missing():
    assert table().get("recNope") is None


def test_get_bulk_order():
    things = table().get_bulk(["rec3", "recNope", "rec1"])
    assert [t.id for t in things] == ["rec3", "rec1"]


def test_skips_invalid_records():
    records = RECORDS + [{"id": "recBad", "fields": {"status": "private@example.com"}}]

    t = InMemoryData.from_records(Thing, records)

    assert t.get("recBad") is None
    assert len(t.data) == 3
    assert t.skipped == [("recBad", "name: missing")]


def test_skip_reason_hides_values():
    records = [{"id": "recBad", "fields": {"name": ["private@example.com"]}}]

    t = InMemoryData.from_records(Thing, records)

    assert "private@example.com" not in t.skipped[0][1]
