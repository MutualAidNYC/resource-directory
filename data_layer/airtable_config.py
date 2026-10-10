"""Read the deployment's Airtable settings (airtable.toml).

The file lists the tables and fields the build requests. Only those are
requested, so anything not listed never leaves Airtable. The file is checked
here, before any request is sent.
"""
from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PATH = REPO_ROOT / "airtable.toml"


class AirtableConfigError(ValueError):
    """The config file is missing or malformed."""


class TableConfig(BaseModel):
    """One [tables.<name>] section."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str  # HSDS table name used in the app, e.g. "services" (the section key)
    fields: tuple[str, ...] = Field(min_length=1)
    id: str | None = Field(default=None, pattern=r"^tbl[A-Za-z0-9]+$")  # None: use `name`
    filter: str | None = None  # Airtable formula; only matching records are pulled

    @field_validator("fields")
    @classmethod
    def _fields_are_unique_names(cls, fields: tuple[str, ...]) -> tuple[str, ...]:
        if any(not f.strip() for f in fields):
            raise ValueError("field names can't be blank")
        duplicates = sorted({f for f in fields if fields.count(f) > 1})
        if duplicates:
            raise ValueError(f"listed twice: {', '.join(duplicates)}")
        return fields

    @field_validator("filter")
    @classmethod
    def _filter_is_not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("must be an Airtable formula")
        return value

    @property
    def ref(self) -> str:
        """What goes in the request URL: the table id, else its name."""
        return self.id or self.name


class AirtableConfig(BaseModel):
    """The whole file."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    tables: dict[str, TableConfig] = Field(min_length=1)

    @model_validator(mode="before")
    @classmethod
    def _name_tables_from_their_keys(cls, raw: object) -> object:
        """[tables.services] becomes TableConfig(name="services", ...)."""
        if isinstance(raw, dict) and isinstance(raw.get("tables"), dict):
            tables = {}
            for key, spec in raw["tables"].items():
                if isinstance(spec, dict):
                    if "name" in spec:
                        raise ValueError(f"[tables.{key}] takes its name from the section key")
                    spec = {**spec, "name": key}
                tables[key] = spec
            raw = {**raw, "tables": tables}
        return raw


def load_config(path: str | Path = DEFAULT_PATH) -> AirtableConfig:
    """Load and validate the config.

    Callers pass Settings.airtable_config (AIRTABLE_CONFIG from the
    environment or .env). Relative paths are from the repo root, so it works
    from any working directory.
    """
    resolved = Path(path)
    if not resolved.is_absolute():
        resolved = REPO_ROOT / resolved
    try:
        raw = tomllib.loads(resolved.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise AirtableConfigError(f"Airtable config not found: {resolved}") from None
    except tomllib.TOMLDecodeError as e:
        raise AirtableConfigError(f"{resolved}: {e}") from None
    try:
        return parse_config(raw)
    except AirtableConfigError as e:
        raise AirtableConfigError(f"{resolved}: {e}") from None


def parse_config(raw: dict[str, Any]) -> AirtableConfig:
    """Validate an already-parsed config, raising AirtableConfigError."""
    try:
        return AirtableConfig.model_validate(raw)
    except ValidationError as e:
        raise AirtableConfigError(_readable(e)) from None


def _readable(error: ValidationError) -> str:
    """One line per problem, e.g. "[tables.services] filters: Extra inputs are not permitted".

    Built without input values, so nothing from the file is echoed back.
    """
    lines = []
    for err in error.errors(include_url=False, include_input=False):
        loc = [str(p) for p in err["loc"]]
        if loc[:1] == ["tables"] and len(loc) >= 2:
            where = f"[tables.{loc[1]}]" + (f" {'.'.join(loc[2:])}" if loc[2:] else "")
        else:
            where = ".".join(loc) or "config"
        lines.append(f"{where}: {err['msg'].removeprefix('Value error, ')}")
    return "; ".join(lines)
