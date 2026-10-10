"""One bulk pull from Airtable.

`load_tables` fetches every page of each configured table, requesting only
the fields in airtable.toml. Nothing else in the build calls Airtable.

Airtable allows 5 requests/second per base, shared with other tools reading
the base. Going over returns 429, and requests fail for the next 30 seconds
(https://airtable.com/developers/web/api/rate-limits), so requests are paced
and a 429 waits that out before retrying.
"""
from __future__ import annotations

import time
from collections.abc import Callable, Iterable
from typing import Any
from urllib.parse import quote

import httpx

from data_layer.airtable_config import AirtableConfig, TableConfig

BASE_URL = "https://api.airtable.com/v0"
PAGE_SIZE = 100
REQUEST_INTERVAL = 0.25  # seconds between requests: 4/s, under the 5/s limit
RATE_LIMIT_WAIT = 31.0  # Airtable: wait 30 s after a 429 before requests succeed
SERVER_ERROR_WAIT = 2.0  # doubled on each retry
MAX_RETRIES = 4
TIMEOUT = 30.0

Record = dict[str, Any]


class AirtableLoadError(RuntimeError):
    """A table could not be loaded."""


def load_tables(
    api_key: str,
    base_id: str,
    config: AirtableConfig,
    tables: Iterable[str] | None = None,
    *,
    client: httpx.Client | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> dict[str, list[Record]]:
    """Fetch every record of each table.

    Returns {table name: [{"id": "rec…", "fields": {…}}, …]}. Defaults to all
    tables in `config` (see airtable_config.load_config). `client` and
    `sleep` are for tests.
    """
    if not api_key or not base_id:
        raise ValueError("api_key and base_id are required")
    if isinstance(tables, str):
        raise TypeError("tables must be a list of table names, not a string")
    names = list(tables) if tables is not None else list(config.tables)
    unknown = [n for n in names if n not in config.tables]
    if unknown:
        raise ValueError(f"Not in the Airtable config: {', '.join(unknown)}")

    own_client = client is None
    http = client or httpx.Client(timeout=TIMEOUT)
    try:
        loader = _Loader(http, api_key, base_id, sleep)
        return {name: loader.fetch_table(config.tables[name]) for name in names}
    finally:
        if own_client:
            http.close()


class _Loader:
    def __init__(
        self,
        client: httpx.Client,
        api_key: str,
        base_id: str,
        sleep: Callable[[float], None],
    ):
        self.client = client
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self.base_id = base_id
        self.sleep = sleep
        self.requested = False

    def fetch_table(self, table: TableConfig) -> list[Record]:
        url = f"{BASE_URL}/{self.base_id}/{quote(table.ref, safe='')}"
        records: list[Record] = []
        offset: str | None = None
        while True:
            pairs = [("pageSize", str(PAGE_SIZE))] + [("fields[]", f) for f in table.fields]
            if table.filter:
                pairs.append(("filterByFormula", table.filter))
            if offset:
                pairs.append(("offset", offset))
            params = httpx.QueryParams(tuple(pairs))
            data = self._get(table.name, url, params)
            try:
                page = [{"id": r["id"], "fields": r.get("fields", {})} for r in data["records"]]
            except (KeyError, TypeError):
                message = f"{table.name}: unexpected response from Airtable"
                raise AirtableLoadError(message) from None
            records += page
            offset = data.get("offset")
            if not offset:
                return records

    def _get(self, name: str, url: str, params: httpx.QueryParams) -> dict[str, Any]:
        server_wait = SERVER_ERROR_WAIT
        for attempt in range(MAX_RETRIES + 1):
            if self.requested:
                self.sleep(REQUEST_INTERVAL)
            self.requested = True
            try:
                response = self.client.get(url, params=params, headers=self.headers)
            except httpx.TransportError as e:
                status, detail = None, type(e).__name__
            else:
                if response.status_code == 200:
                    try:
                        body = response.json()
                    except ValueError:
                        raise AirtableLoadError(f"{name}: Airtable returned invalid JSON") from None
                    if not isinstance(body, dict):
                        raise AirtableLoadError(f"{name}: unexpected response from Airtable")
                    return body
                status, detail = response.status_code, _error_type(response)

            retryable = status is None or status == 429 or status >= 500
            if not retryable or attempt == MAX_RETRIES:
                raise AirtableLoadError(
                    f"{name}: Airtable request failed ({status or 'network'}: {detail})"
                )
            if status == 429:
                self.sleep(RATE_LIMIT_WAIT)
            else:
                self.sleep(server_wait)
                server_wait *= 2
        raise AssertionError("unreachable")


def _error_type(response: httpx.Response) -> str:
    """Airtable's error type, e.g. UNKNOWN_FIELD_NAME. Never the request itself."""
    try:
        body = response.json()
    except ValueError:
        return "no details"
    error = body.get("error") if isinstance(body, dict) else None
    if isinstance(error, dict):
        error = error.get("type")
    return str(error or "no details")
