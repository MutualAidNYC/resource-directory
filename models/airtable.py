"""Airtable records as the app reads them.

Each model accepts fields as Airtable sends them (its names, lists for links
and multi-selects) and exposes the names the app uses, so the build never
special-cases Airtable shapes. `id` is always the Airtable record id.
The fields are the ones airtable.toml requests: add a field in both places.
"""
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

def _first(value: object) -> object:
    """Links and multi-selects arrive as lists; these fields hold one value."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


# A single value Airtable sends as a one-item list (a link or a multi-select).
FirstOf = Annotated[str | None, BeforeValidator(_first)]

# For models with a `validation_alias` (the Airtable name): also accept the app's own name.
BY_NAME = ConfigDict(validate_by_name=True)


class OrganizationResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    email: str | None = None
    website: str | None = None
    phones: list[str] | None = None
    locations: list[str] | None = None


class ServiceResponse(BaseModel):
    """A service record as read from Airtable."""
    model_config = BY_NAME

    id: str
    name: str
    organizations: list[str] | None = None
    description: str | None = None
    url: str | None = None
    email: str | None = None
    assured_date: str | None = None

    # Related objects
    phones: list[str] | None = None
    service_areas: list[str] | None = None
    service_at_locations: list[str] | None = None
    languages: list[str] | None = None

    # Custom extension fields (non-HSDS standard)
    need_focus: list[str] | None = Field(  # Need categories
        default=None, validation_alias="needFocus"
    )
    community_focus: list[str] | None = Field(  # Target communities
        default=None, validation_alias="communityFocus"
    )


class ServiceAtLocationResponse(BaseModel):
    id: str
    locations: list[str] | None = None

    @property
    def location_id(self) -> str | None:
        """The record's one location (Airtable links at most one), if it has any."""
        return self.locations[0] if self.locations else None


class LocationResponse(BaseModel):
    id: str
    location_type: FirstOf = None  # multi-select in Airtable
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    addresses: list[str] | None = None

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None


class AddressResponse(BaseModel):
    """Address details."""
    id: str
    address_1: str | None = None
    address_2: str | None = None
    city: str | None = None
    state_province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    address_type: FirstOf = None  # multi-select in Airtable


class LanguageResponse(BaseModel):
    id: str
    name: str | None = None
    code: str | None = None


class ServiceAreaResponse(BaseModel):
    """Who a service is for (e.g. a borough), not where it is."""
    model_config = BY_NAME

    id: str
    name: str | None = None
    order: float | None = Field(default=None, validation_alias="x-order")  # order in filters


class TaxonomyResponse(BaseModel):
    id: str
    name: str
    description: str | None = None


class TaxonomyTermResponse(BaseModel):
    model_config = BY_NAME

    id: str
    name: str
    description: str | None = None
    taxonomy_id: FirstOf = Field(default=None, validation_alias="taxonomy")


class PhoneResponse(BaseModel):
    """Phone number details."""
    id: str
    number: str
