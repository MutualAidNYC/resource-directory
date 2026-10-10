"""
HSDS 3.0 Pydantic Models with UK Open Referral (ORUK) Compliance.

Defines all data models conforming to the Human Services Data Specification.
See: https://docs.openreferral.org/en/latest/hsds/schema_reference.html
See: https://openreferraluk.org/developers/compliance
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class ORUKBaseModel(BaseModel):
    """
    Base model for ORUK compliance.
    
    UK Open Referral requires that optional fields without values
    should be omitted rather than included with null values.
    """
    model_config = ConfigDict(
        # Exclude None values from JSON serialization (ORUK requirement)
        json_encoders={},
    )
    
    def model_dump(self, **kwargs):
        """Override to exclude None values by default."""
        kwargs.setdefault('exclude_none', True)
        return super().model_dump(**kwargs)


# ============================================================================
# Enums
# ============================================================================

class ServiceStatus(str, Enum):
    """Possible status values for a service."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEFUNCT = "defunct"
    TEMPORARILY_CLOSED = "temporarily_closed"


class LocationType(str, Enum):
    """Type of location."""
    PHYSICAL = "physical"
    POSTAL = "postal"
    VIRTUAL = "virtual"


class AddressType(str, Enum):
    """Type of address."""
    PHYSICAL = "physical"
    POSTAL = "postal"
    VIRTUAL = "virtual"


class PhoneType(str, Enum):
    """Type of phone number."""
    TEXT = "text"
    VOICE = "voice"
    FAX = "fax"
    CELL = "cell"
    VIDEO = "video"
    PAGER = "pager"
    TEXTPHONE = "textphone"


# ============================================================================
# Supporting Objects
# ============================================================================

class Phone(ORUKBaseModel):
    """Phone number details."""
    id: str
    number: str
    extension: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None


class Address(ORUKBaseModel):
    """Address details."""
    id: str
    address_1: Optional[str] = None
    address_2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    address_type: Optional[str] = None
    attention: Optional[str] = None


class Language(ORUKBaseModel):
    """Language availability."""
    id: str
    name: Optional[str] = None
    code: Optional[str] = None
    note: Optional[str] = None


class Accessibility(ORUKBaseModel):
    """Accessibility information for a location."""
    id: str
    description: Optional[str] = None
    details: Optional[str] = None
    url: Optional[str] = None


class Schedule(ORUKBaseModel):
    """Schedule information using RFC 5545 RRULE format."""
    id: str
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    dtstart: Optional[str] = None
    timezone: Optional[str] = None
    until: Optional[str] = None
    count: Optional[str] = None
    wkst: Optional[str] = None
    freq: Optional[str] = None
    interval: Optional[str] = None
    byday: Optional[str] = None
    byweekno: Optional[str] = None
    bymonthday: Optional[str] = None
    byyearday: Optional[str] = None
    description: Optional[str] = None
    opens_at: Optional[str] = None
    closes_at: Optional[str] = None
    schedule_link: Optional[str] = None
    attending_type: Optional[str] = None
    notes: Optional[str] = None


class ServiceArea(ORUKBaseModel):
    """Geographic service area."""
    id: str
    name: Optional[str] = None
    description: Optional[str] = None
    extent: Optional[str] = None
    extent_type: Optional[str] = None
    uri: Optional[str] = None


class Contact(ORUKBaseModel):
    """Contact person details."""
    id: str
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phones: Optional[List[Phone]] = None


class Funding(ORUKBaseModel):
    """Funding source information."""
    id: str
    source: Optional[str] = None


class RequiredDocument(ORUKBaseModel):
    """Required document for a service."""
    id: str
    document: Optional[str] = None
    uri: Optional[str] = None


class CostOption(ORUKBaseModel):
    """Cost/fee option for a service."""
    id: str
    option: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    amount_description: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


class Program(ORUKBaseModel):
    """Program grouping related services."""
    id: str
    name: str
    alternate_name: Optional[str] = None
    description: Optional[str] = None


class OrganizationIdentifier(ORUKBaseModel):
    """External identifier for an organization."""
    id: str
    identifier: Optional[str] = None
    identifier_scheme: Optional[str] = None
    identifier_type: Optional[str] = None


class Url(ORUKBaseModel):
    """Additional URL."""
    id: str
    label: Optional[str] = None
    url: str


class Attribute(ORUKBaseModel):
    """Links a record (here: a service) to a taxonomy term."""
    id: str
    link_id: str  # id of the linked record
    taxonomy_term_id: str
    link_entity: str  # table of the linked record, e.g. "service"
    link_type: Optional[str] = None
    value: Optional[str] = None
    label: Optional[str] = None


# ============================================================================
# Taxonomy Objects
# ============================================================================

class Taxonomy(ORUKBaseModel):
    """Taxonomy classification system."""
    id: str
    name: str
    description: Optional[str] = None
    uri: Optional[str] = None
    version: Optional[str] = None


class TaxonomyTerm(ORUKBaseModel):
    """Term within a taxonomy."""
    id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    taxonomy: Optional[str] = None
    taxonomy_id: Optional[str] = None
    taxonomy_detail: Optional[Taxonomy] = None
    language: Optional[str] = None
    term_uri: Optional[str] = None


# ============================================================================
# Core Objects
# ============================================================================

class Location(ORUKBaseModel):
    """Location where services are provided."""
    id: str
    location_type: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    alternate_name: Optional[str] = None
    description: Optional[str] = None
    transportation: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    external_identifier: Optional[str] = None
    external_identifier_type: Optional[str] = None
    addresses: Optional[List[Address]] = None
    phones: Optional[List[Phone]] = None
    accessibility: Optional[List[Accessibility]] = None
    languages: Optional[List[Language]] = None
    schedules: Optional[List[Schedule]] = None


class OrganizationSummary(ORUKBaseModel):
    """Minimal organization info for embedding."""
    id: str
    name: str
    alternate_name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    uri: Optional[str] = None


class Organization(ORUKBaseModel):
    """Full organization details."""
    id: str
    name: str
    alternate_name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    year_incorporated: Optional[int] = None
    legal_status: Optional[str] = None
    logo: Optional[str] = None
    uri: Optional[str] = None
    parent_organization_id: Optional[str] = None
    phones: Optional[List[Phone]] = None
    locations: Optional[List[Location]] = None
    programs: Optional[List[Program]] = None
    funding: Optional[List[Funding]] = None
    organization_identifiers: Optional[List[OrganizationIdentifier]] = None


class ServiceAtLocation(ORUKBaseModel):
    """Link between a service and a location."""
    id: str
    service_id: Optional[str] = None
    description: Optional[str] = None
    location: Optional[Location] = None
    phones: Optional[List[Phone]] = None
    schedules: Optional[List[Schedule]] = None
    service_areas: Optional[List[ServiceArea]] = None


class Service(ORUKBaseModel):
    """Full service details - ORUK compliant with required fields."""
    id: str
    organization_id: Optional[str]  # Required by HSDS; None only if its organization isn't published
    name: str
    status: str = "active"  # Required by HSDS
    alternate_name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    email: Optional[str] = None
    interpretation_services: Optional[str] = None
    application_process: Optional[str] = None
    fees_description: Optional[str] = None
    accreditations: Optional[str] = None
    eligibility_description: Optional[str] = None
    minimum_age: Optional[int] = None
    maximum_age: Optional[int] = None
    assured_date: Optional[str] = None
    alert: Optional[str] = None
    last_modified: Optional[str] = None
    
    # Related objects
    organization: Optional[OrganizationSummary] = None
    program: Optional[Program] = None
    phones: Optional[List[Phone]] = None
    schedules: Optional[List[Schedule]] = None
    service_areas: Optional[List[ServiceArea]] = None
    service_at_locations: Optional[List[ServiceAtLocation]] = None
    languages: Optional[List[Language]] = None
    funding: Optional[List[Funding]] = None
    cost_options: Optional[List[CostOption]] = None
    required_documents: Optional[List[RequiredDocument]] = None
    attributes: Optional[List[Attribute]] = None  # taxonomy terms (categories)
    
    # Custom extension fields (non-HSDS standard)
    group_name: Optional[str] = None  # Organization/group name from Airtable
    need_focus: Optional[List[str]] = None  # Need categories
    community_focus: Optional[List[str]] = None  # Target communities


class ServiceSummary(ORUKBaseModel):
    """Minimal service info for list views - ORUK compliant."""
    id: str
    organization_id: Optional[str]  # Required by HSDS; None only if its organization isn't published
    name: str
    status: str = "active"  # Required by HSDS
    alternate_name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    email: Optional[str] = None
    last_modified: Optional[str] = None
    organization: Optional[OrganizationSummary] = None
    program: Optional[Program] = None
    # Taxonomy fields for category filtering
    need_focus: Optional[List[str]] = None
    community_focus: Optional[List[str]] = None


class OrganizationListItem(OrganizationSummary):
    """An organization in the organizations list."""
    service_count: int  # published services linked to the organization


# ============================================================================
# Pagination
# ============================================================================

class Page(ORUKBaseModel):
    """Paginated response wrapper."""
    total_items: int
    total_pages: int
    page_number: int
    size: int
    first_page: bool
    last_page: bool
    empty: bool
    contents: List


# ============================================================================
# API Root Response
# ============================================================================

class ApiInfo(ORUKBaseModel):
    """Root endpoint response - ORUK compliant."""
    version: str = "HSDS-UK-3.0"
    profile: str = "https://github.com/OpenReferralUK/uk-profile/blob/main/docs/index.md"
    openapi_url: str = "/openapi.json"
