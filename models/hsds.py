"""
The HSDS objects the API publishes (Human Services Data Specification).

Each model has only the fields the build sets; the schemas in schemas/hsds/ list
the rest. Fields without a value are left out of the output, not written as null:
HSDS doesn't allow null.
See: https://docs.openreferral.org/en/latest/hsds/schema_reference.html
See: https://openreferraluk.org/developers/compliance
"""
from typing import Any

from pydantic import BaseModel

# The version of HSDS that the API's data follows. The build records it in
# download.json and checks its files against this version's schemas in
# schemas/hsds/<version>/. To move to a new version, see schemas/hsds/README.md.
HSDS_VERSION = "3.3.1"


class HSDSModel(BaseModel):
    """Base for the HSDS objects: model_dump() leaves out fields without a value."""

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:  # noqa: ANN401 (pydantic's own kwargs)
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(**kwargs)


# ============================================================================
# Supporting Objects
# ============================================================================

class Phone(HSDSModel):
    """Phone number details."""
    id: str
    number: str


class Address(HSDSModel):
    """Address details."""
    id: str
    address_1: str | None = None
    address_2: str | None = None
    city: str | None = None
    state_province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    address_type: str | None = None


class Language(HSDSModel):
    """Language availability."""
    id: str
    name: str | None = None
    code: str | None = None


class Attribute(HSDSModel):
    """Links a record (here: a service) to a taxonomy term."""
    id: str
    link_id: str  # id of the linked record
    taxonomy_term_id: str
    link_entity: str  # table of the linked record, e.g. "service"


# ============================================================================
# Taxonomy Objects
# ============================================================================

class Taxonomy(HSDSModel):
    """Taxonomy classification system."""
    id: str
    name: str
    description: str | None = None


class TaxonomyTerm(HSDSModel):
    """Term within a taxonomy."""
    id: str
    name: str
    description: str | None = None
    taxonomy: str | None = None
    taxonomy_id: str | None = None
    taxonomy_detail: Taxonomy | None = None


# ============================================================================
# Core Objects
# ============================================================================

class Location(HSDSModel):
    """Location where services are provided."""
    id: str
    location_type: str | None = None
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    addresses: list[Address] | None = None


class OrganizationSummary(HSDSModel):
    """Minimal organization info for embedding."""
    id: str
    name: str
    description: str | None = None
    email: str | None = None
    website: str | None = None


class Organization(HSDSModel):
    """Full organization details."""
    id: str
    name: str
    description: str | None = None
    email: str | None = None
    website: str | None = None
    phones: list[Phone] | None = None
    locations: list[Location] | None = None


class ServiceAtLocation(HSDSModel):
    """Link between a service and a location."""
    id: str
    service_id: str | None = None
    location_id: str | None = None
    location: Location | None = None


class Service(HSDSModel):
    """Full service details."""
    id: str
    organization_id: str | None  # None only if its organization isn't published
    name: str
    status: str = "active"  # Required by HSDS
    description: str | None = None
    url: str | None = None
    email: str | None = None
    assured_date: str | None = None

    # Related objects
    phones: list[Phone] | None = None
    service_at_locations: list[ServiceAtLocation] | None = None
    languages: list[Language] | None = None
    attributes: list[Attribute] | None = None  # taxonomy terms (categories)


class ServiceSummary(HSDSModel):
    """Minimal service info for list views."""
    id: str
    organization_id: str | None  # None only if its organization isn't published
    name: str
    status: str = "active"  # Required by HSDS
    description: str | None = None
    url: str | None = None
    email: str | None = None
    assured_date: str | None = None
