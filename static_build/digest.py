"""The Airtable digest: the build report's records to fix, posted to a chat webhook for the
volunteers who keep the data. Each line links its Airtable record. Like the report, it names
records by id and name, never contact details.

build_dataset.py posts it from production builds in the daily rebuild's hour.
"""

from __future__ import annotations

from collections.abc import Mapping

import httpx

from static_build.report import Report, problems

MAX_LINES = 50  # Slack cuts long messages; the rest show once these are fixed


def digest(report: Report, base_id: str, table_ids: Mapping[str, str | None]) -> str | None:
    """The message, or None when there's nothing to fix. table_ids: table → Airtable table id."""
    lines: list[str] = []
    for title, items in problems(report):
        if items:
            lines.append(f"{title}: {len(items)}")
        for table, record_id, line in items:
            table_id = table_ids.get(table)
            link = f" https://airtable.com/{base_id}/{table_id}/{record_id}" if table_id else ""
            lines.append(f"• {line}{link}")
    if not lines:
        return None
    if len(lines) > MAX_LINES:
        lines = [*lines[:MAX_LINES], f"…and {len(lines) - MAX_LINES} more."]
    return "\n".join(["Airtable records to fix, from today's build:", *lines])


def post(webhook: str, text: str, transport: httpx.BaseTransport | None = None) -> None:
    """POST Slack's incoming-webhook format, {"text": …}.

    Errors leave out the URL: it's the secret."""
    try:
        with httpx.Client(transport=transport, timeout=30) as client:
            response = client.post(webhook, json={"text": text})
    except httpx.HTTPError:
        raise RuntimeError("the digest webhook request failed before a response") from None
    if response.is_error:
        raise RuntimeError(f"the digest webhook answered {response.status_code}")
