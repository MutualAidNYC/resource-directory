"""Smoke test: the whole build, with the sample pull standing in for Airtable."""
import json
from pathlib import Path
from typing import Any, NoReturn

import pytest

import build_dataset
from data_layer.ids import hsds_id
from data_layer.loader import AirtableLoadError
from static_build.files import ApiFile
from tests.unit.application_layer.sample_pull import FRIDGE, ORPHAN, pull

pytestmark = pytest.mark.unit


def airtable_returns(monkeypatch: pytest.MonkeyPatch, tables: dict[str, Any]) -> None:
    """Make the build's Airtable pull return these tables instead of calling Airtable."""
    monkeypatch.setattr(build_dataset, "pull_from_airtable", lambda: tables)


def test_builds_from_one_pull(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    airtable_returns(monkeypatch, pull())
    out = tmp_path / "dist"
    stale = out / "api" / "services" / "deleted-service.json"
    stale.parent.mkdir(parents=True)
    stale.write_text("{}")

    assert build_dataset.main(["--out", str(out)]) == 0

    fridge = out / "api" / "services" / hsds_id("services", FRIDGE)
    assert json.loads(fridge.read_text(encoding="utf-8"))["name"] == "Fridge"
    assert (out / "api" / "download.json").exists()
    assert not stale.exists()  # nothing outlives its record
    site = json.loads((out / "site-data" / "map.json").read_text(encoding="utf-8"))
    assert site["services"][0]["needFocus"] == ["Food"]  # the site's data: matched names
    assert not (out / "api" / "map.json").exists()  # site-only, never in the API
    worker = json.loads((out / "worker-data" / "data.json").read_text(encoding="utf-8"))
    assert [s["name"] for s in worker["services"]] == ["Fridge", "Hotline", "Orphan"]
    assert sorted(p.name for p in (out / "api").iterdir() if p.is_file()) == [
        "download.json",
        "openapi.json",
    ]
    printed = capsys.readouterr().out
    assert "Build report" in printed
    assert f"{ORPHAN} (Orphan)" in printed  # the service with no published organization


def test_no_published_services_fails_the_build_and_keeps_the_last_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    # e.g. the status value the services filter matches was renamed in Airtable
    raw = pull()
    raw["services"] = []
    airtable_returns(monkeypatch, raw)
    out = tmp_path / "dist"
    last_build = out / "api" / "download.json"
    last_build.parent.mkdir(parents=True)
    last_build.write_text("{}")

    assert build_dataset.main(["--out", str(out)]) == 1
    assert "no published services" in capsys.readouterr().err
    assert last_build.exists()


def test_a_failed_pull_fails_the_build(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    def failing_pull() -> NoReturn:
        raise AirtableLoadError("services: Airtable request failed (429: no details)")

    monkeypatch.setattr(build_dataset, "pull_from_airtable", failing_pull)

    assert build_dataset.main(["--out", str(tmp_path / "dist")]) == 1
    assert "Build failed: services: Airtable request failed" in capsys.readouterr().err
    assert not (tmp_path / "dist").exists()


def test_a_file_name_cannot_write_outside_api(tmp_path: Path):
    # e.g. an id read from an Airtable field, if ids ever stop being UUIDs
    with pytest.raises(ValueError, match="refusing to write outside"):
        build_dataset.write([ApiFile("api/services/../../outside.json", {})], tmp_path)

    assert not (tmp_path / "outside.json").exists()
