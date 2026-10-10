from collections.abc import Callable

import httpx
import pytest

from data_layer import loader
from data_layer.airtable_config import AirtableConfig, parse_config
from data_layer.loader import AirtableLoadError, load_tables

pytestmark = pytest.mark.unit


API_KEY = "test-key"
BASE_ID = "appTEST0000000000"
SERVICES_ID = "tblSERVICES000000"

CONFIG = parse_config(
    {
        "tables": {
            "services": {
                "id": SERVICES_ID,
                "fields": ["name", "status"],
                "filter": "{status} = 'Published'",
            },
            "languages": {"fields": ["name", "code"]},  # no id: requested by name
        }
    }
)

Handler = Callable[[httpx.Request], httpx.Response]


class FakeAirtable:
    """Serves pages of fake records and logs every request."""

    def __init__(self, pages: dict[str, list[list[dict]]], errors: dict[int, int] | None = None):
        self.pages = pages  # table id (or name) -> pages of records
        self.errors = errors or {}  # request number (from 1) -> status to return instead
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        status = self.errors.get(len(self.requests))
        if status is not None:
            return httpx.Response(status, json={"error": {"type": "TEST_ERROR"}})
        table_id = request.url.path.rsplit("/", 1)[-1]
        pages = self.pages.get(table_id, [[]])
        index = int(request.url.params.get("offset", "0"))
        body: dict = {"records": pages[index]}
        if index + 1 < len(pages):
            body["offset"] = str(index + 1)
        return httpx.Response(200, json=body)


def records(prefix: str, count: int) -> list[dict]:
    return [
        {"id": f"rec{prefix}{i:04d}", "fields": {"name": f"{prefix} {i}"}} for i in range(count)
    ]


@pytest.fixture
def sleeps() -> list[float]:
    return []


def run(
    handler: Handler,
    sleeps: list[float],
    tables: list[str] | None = None,
    config: AirtableConfig = CONFIG,
) -> dict[str, list[dict]]:
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        return load_tables(API_KEY, BASE_ID, config, tables, client=client, sleep=sleeps.append)


# What gets requested

def test_requests_config_fields(sleeps: list[float]):
    fake = FakeAirtable({})

    result = run(fake, sleeps)

    assert set(result) == {"services", "languages"}
    assert [r.url.path for r in fake.requests] == [
        f"/v0/{BASE_ID}/{SERVICES_ID}",
        f"/v0/{BASE_ID}/languages",
    ]
    assert [r.url.params.get_list("fields[]") for r in fake.requests] == [
        ["name", "status"],
        ["name", "code"],
    ]


def test_url_encodes_table_names(sleeps: list[float]):
    config = parse_config({"tables": {"service areas/NYC": {"fields": ["name"]}}})
    fake = FakeAirtable({})

    run(fake, sleeps, config=config)

    path = fake.requests[0].url.raw_path.split(b"?")[0]
    assert path.endswith(b"/service%20areas%2FNYC")


def test_sends_filter_when_set(sleeps: list[float]):
    fake = FakeAirtable({SERVICES_ID: [records("a", 1)] * 2})

    run(fake, sleeps)

    *services, languages = fake.requests
    assert [r.url.params.get_list("filterByFormula") for r in services] == [
        ["{status} = 'Published'"]
    ] * 2
    assert "filterByFormula" not in languages.url.params


def test_bearer_token(sleeps: list[float]):
    fake = FakeAirtable({})

    run(fake, sleeps, ["languages"])

    assert fake.requests[0].headers["Authorization"] == f"Bearer {API_KEY}"


# What comes back

def test_fetches_all_pages(sleeps: list[float]):
    pages = [records("a", 100) for _ in range(7)] + [records("b", 3)]
    fake = FakeAirtable({SERVICES_ID: pages})

    result = run(fake, sleeps, ["services"])

    assert len(result["services"]) == 703
    assert len(fake.requests) == 8


def test_returns_ids_and_fields(sleeps: list[float]):
    fake = FakeAirtable({"languages": [records("x", 2)]})

    result = run(fake, sleeps, ["languages"])

    assert result["languages"][0] == {"id": "recx0000", "fields": {"name": "x 0"}}


def test_invalid_json(sleeps: list[float]):
    def broken(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"<html>not json</html>")

    with pytest.raises(AirtableLoadError, match="invalid JSON"):
        run(broken, sleeps, ["languages"])


def test_unexpected_shape(sleeps: list[float]):
    def odd(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"rows": []})

    with pytest.raises(AirtableLoadError, match="unexpected response"):
        run(odd, sleeps, ["languages"])


# Pacing and retries

def test_paces_requests(sleeps: list[float]):
    fake = FakeAirtable({SERVICES_ID: [records("a", 1)] * 3})

    run(fake, sleeps, ["services"])

    assert sleeps == [loader.REQUEST_INTERVAL] * 2


def test_rate_limit_resumes_page(sleeps: list[float]):
    pages = [records("a", 2), records("b", 2), records("c", 2)]
    fake = FakeAirtable({SERVICES_ID: pages}, errors={2: 429})  # page 2 is rate limited

    result = run(fake, sleeps, ["services"])

    assert [r["id"] for r in result["services"]] == [
        "reca0000", "reca0001", "recb0000", "recb0001", "recc0000", "recc0001",
    ]
    offsets = [r.url.params.get("offset") for r in fake.requests]
    assert offsets == [None, "1", "1", "2"]
    assert loader.RATE_LIMIT_WAIT in sleeps


def test_server_error_backoff(sleeps: list[float]):
    fake = FakeAirtable({"languages": [records("x", 1)]}, errors={1: 502, 2: 503})

    result = run(fake, sleeps, ["languages"])

    assert len(result["languages"]) == 1
    waits = [s for s in sleeps if s != loader.REQUEST_INTERVAL]
    assert waits == [loader.SERVER_ERROR_WAIT, loader.SERVER_ERROR_WAIT * 2]


def test_retries_network_errors(sleeps: list[float]):
    calls = {"n": 0}

    def flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("boom", request=request)
        return httpx.Response(200, json={"records": []})

    result = run(flaky, sleeps, ["languages"])

    assert result == {"languages": []}
    assert calls["n"] == 2


def test_max_retries(sleeps: list[float]):
    attempts = loader.MAX_RETRIES + 1
    fake = FakeAirtable({}, errors={n: 429 for n in range(1, attempts + 1)})

    with pytest.raises(AirtableLoadError, match="languages.*429"):
        run(fake, sleeps, ["languages"])

    assert len(fake.requests) == attempts


@pytest.mark.parametrize("status", [401, 403, 404, 422])
def test_client_error_no_retry(sleeps: list[float], status: int):
    fake = FakeAirtable({}, errors={1: status})

    with pytest.raises(AirtableLoadError, match=str(status)):
        run(fake, sleeps, ["languages"])

    assert len(fake.requests) == 1


@pytest.mark.parametrize("body", [b"[]", b"null", b'"oops"', b'{"error": {"type": null}}'])
def test_error_without_type(sleeps: list[float], body: bytes):
    def odd_error(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, content=body)

    with pytest.raises(AirtableLoadError, match="422: no details"):
        run(odd_error, sleeps, ["languages"])


def test_error_hides_api_key(sleeps: list[float]):
    fake = FakeAirtable({}, errors={1: 401})

    with pytest.raises(AirtableLoadError) as excinfo:
        run(fake, sleeps, ["languages"])

    assert API_KEY not in str(excinfo.value)


# Arguments

def test_rejects_unknown_table():
    with pytest.raises(ValueError, match="contacts"):
        load_tables(API_KEY, BASE_ID, CONFIG, ["contacts"])


def test_rejects_string_tables():
    with pytest.raises(TypeError):
        load_tables(API_KEY, BASE_ID, CONFIG, "services")


def test_requires_credentials():
    with pytest.raises(ValueError):
        load_tables("", BASE_ID, CONFIG)
