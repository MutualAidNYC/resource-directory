"""The build's settings, read from the environment or `.env`."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings for build_dataset.py."""

    airtable_api_key: str
    airtable_base_id: str

    # Tables and fields the static build requests; relative paths are from
    # the repo root. See data_layer/airtable_config.py.
    airtable_config: str = "airtable.toml"

    # extra="ignore": other variables in .env don't fail the build.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
