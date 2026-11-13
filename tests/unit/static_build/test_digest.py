import dataclasses
from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest

import build_dataset
from config import Settings
from static_build.digest import MAX_LINES, digest, post
from tests.unit.application_layer.sample_pull import HOTLINE, ORPHAN, pull
from tests.unit.static_build.test_build_report import report_for

pytestmark = pytest.mark.unit

WEBHOOK = "https://hooks.slack.com/services/T000/B000/secret-webhook"


def test_digest_links_each_record_to_fix():
    text = digest(report_for(pull()), "appTest", {"services": "tblServices"})

    assert text is not None
    assert "Published services with no published organization: 1" in text
    assert f"• {ORPHAN} (Orphan) https://airtable.com/appTest/tblServices/{ORPHAN}" in text
    link = f"https://airtable.com/appTest/tblServices/{HOTLINE}"
    assert f"• {HOTLINE} (Hotline): Mystery {link}" in text
    assert "fridge@example.org" not in text


def test_digest_is_none_when_nothing_needs_fixing():
    clean = dataclasses.replace(
        report_for(pull()),
        skipped={},
        without_organization=[],
        without_service_area=[],
        unmatched_categories={},
        partial_locations=[],
    )
    assert digest(clean, "appTest", {}) is None


def test_long_digest_is_cut():
    orphans = [f"rec{i}" for i in range(80)]
    many = dataclasses.replace(report_for(pull()), without_organization=orphans)
    lines = digest(many, "appTest", {})

    assert lines is not None
    assert len(lines.splitlines()) == MAX_LINES + 2  # the heading, the lines, "…and N more."
    assert lines.endswith("more.")


def unreachable(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError(f"can't reach {request.url}")


@pytest.mark.parametrize("answer", [lambda request: httpx.Response(500), unreachable])
def test_post_errors_leave_out_the_webhook_url(answer: Callable[[httpx.Request], httpx.Response]):
    with pytest.raises(RuntimeError) as error:
        post(WEBHOOK, "hi", transport=httpx.MockTransport(answer))
    assert "secret-webhook" not in str(error.value)


def test_digest_posts_only_in_the_daily_rebuilds_hour(monkeypatch: pytest.MonkeyPatch):
    posted: list[str] = []
    monkeypatch.setattr(build_dataset, "post", lambda webhook, text: posted.append(text))
    settings = Settings(airtable_api_key="key", airtable_base_id="appTest")
    monkeypatch.setattr(build_dataset, "get_settings", lambda: settings)
    report = report_for(pull())
    at = lambda hour: datetime(2026, 11, 12, hour, 9, tzinfo=UTC)  # noqa: E731

    monkeypatch.delenv("DIGEST_WEBHOOK_URL", raising=False)
    build_dataset.send_digest(report, at(10))  # no webhook: a local or test build
    monkeypatch.setenv("DIGEST_WEBHOOK_URL", WEBHOOK)
    build_dataset.send_digest(report, at(11))
    assert posted == []

    build_dataset.send_digest(report, at(10))
    assert len(posted) == 1
    assert "https://airtable.com/appTest/tbl" in posted[0]  # table ids from airtable.toml


def test_a_bad_webhook_never_fails_the_build(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    settings = Settings(airtable_api_key="key", airtable_base_id="appTest")
    monkeypatch.setattr(build_dataset, "get_settings", lambda: settings)
    monkeypatch.setenv("DIGEST_WEBHOOK_URL", WEBHOOK + "\n")  # pasted with a newline

    build_dataset.send_digest(report_for(pull()), datetime(2026, 11, 12, 10, 9, tzinfo=UTC))

    err = capsys.readouterr().err
    assert "Digest not posted" in err
    assert "secret-webhook" not in err
