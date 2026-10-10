
import pytest
from pydantic import BaseModel

from application_layer import application_layer
from config import Settings
from data_layer.data import InMemoryData
from models.airtable import (
    AccessibilityResponse,
    AddressResponse,
    ContactResponse,
    LocationResponse,
    PhoneResponse,
    ScheduleResponse,
    ServiceAtLocationResponse,
    ServiceResponse,
)
from models.hsds import (
    Accessibility,
    Address,
    Contact,
    Location,
    Phone,
    Schedule,
    ServiceAtLocation,
)

# Fixtures for test data - test

@pytest.fixture
def base_address_response() -> AddressResponse:
    return AddressResponse(
        id="addr1",
        address_1="123 Main St",
        city="New York",
        state_province="NY",
        postal_code="10001",
        country="USA",
    )

@pytest.fixture
def base_contact_response() -> ContactResponse:
    return ContactResponse(
        id="contact1",
        name="Jane Doe",
        title="Director",
        department="Outreach",
        email="foo@abc.com",
    )

@pytest.fixture
def base_phone_response() -> PhoneResponse:
    return PhoneResponse(
        id="phone1",
        number="555-123-4567",
        extension="123",
        type="Office",
        description="Main office line",
    )

@pytest.fixture
def base_schedule_response() -> ScheduleResponse:
    return ScheduleResponse(
        id="schedule1",
        valid_from="2024-01-01T09:00:00Z",
        valid_to="2024-12-31T17:00:00Z",
        dtstart="2024-01-01T09:00:00Z",
        timezone="America/New_York",
        freq="WEEKLY",
        byday="MO,WE,FR",
        description="Open every Monday, Wednesday, and Friday from 9am to 5pm",
        opens_at="09:00:00",
        closes_at="17:00:00",
        schedule_link="https://example.com/schedule",
        attending_type="In-person",
        notes="Closed on holidays",
    )

@pytest.fixture
def base_location_response(base_address_response: AddressResponse) -> LocationResponse:
    return LocationResponse(
        id="loc1",
        location_type="Physical",
        url="https://example.com/location",
        name="Main Office",
        alternate_name="Headquarters",
        description="Our main office location",
        transportation="Subway: A, C, E to 42nd St; Bus: M42, M104",
        latitude=40.7128,
        longitude=-74.0060,
        external_identifier="LOC123",
        external_identifier_type="InternalID",
        addresses=[base_address_response.id],
        accessibility=["Wheelchair accessible", "Braille signage"],
    )

@pytest.fixture
def base_accessibility_response() -> AccessibilityResponse:
    return AccessibilityResponse(
        id='acc1',
        description='Wheelchair accessible, Braille signage',
        details='This location is wheelchair accessible',
        url='foo.bar/accessibility/acc1',
    )

@pytest.fixture
def service_at_location_response_with_no_locations(
    base_contact_response: ContactResponse,
    base_phone_response: PhoneResponse,
    base_schedule_response: ScheduleResponse
) -> ServiceAtLocationResponse:
    return ServiceAtLocationResponse(
        id="sal1",
        service_id="svc1",
        locations=None,
        contacts=[base_contact_response.id],
        phones=[base_phone_response.id],
        schedules=[base_schedule_response.id],
    )

@pytest.fixture
def full_service_at_location_response(
    base_location_response: LocationResponse,
    base_contact_response: ContactResponse,
    base_phone_response: PhoneResponse,
    base_schedule_response: ScheduleResponse
) -> ServiceAtLocationResponse:
    return ServiceAtLocationResponse(
        id="sal2",
        service_id="svc2",
        locations=[base_location_response.id],
        contacts=[base_contact_response.id],
        phones=[base_phone_response.id],
        schedules=[base_schedule_response.id],
    )

@pytest.fixture
def service_response(
    full_service_at_location_response: ServiceAtLocationResponse
) -> ServiceResponse:
    return ServiceResponse(
        id=full_service_at_location_response.service_id,
        organization_id="org1",
        name="Food Assistance",
        status="Published",
        description="Provides food assistance to individuals and families in need.",
        organization="org1",
    )

@pytest.fixture
def expected_service_at_location_with_locations_result(
    full_service_at_location_response: ServiceAtLocationResponse,
    base_location_response: LocationResponse,
    base_contact_response: ContactResponse,
    base_phone_response: PhoneResponse,
    base_schedule_response: ScheduleResponse
) -> ServiceAtLocation:
    return ServiceAtLocation(
        id=full_service_at_location_response.id,
        service_id=full_service_at_location_response.service_id,
        location=Location(
            id=base_location_response.id,
            location_type=base_location_response.location_type,
            url=base_location_response.url,
            name=base_location_response.name,
            alternate_name=base_location_response.alternate_name,
            description=base_location_response.description,
            transportation=base_location_response.transportation,
            latitude=base_location_response.latitude,
            longitude=base_location_response.longitude,
            external_identifier=base_location_response.external_identifier,
            external_identifier_type=base_location_response.external_identifier_type,
            addresses=[
                Address(
                    id=base_location_response.addresses[0],
                    address_1="123 Main St",
                    city="New York",
                    state_province="NY",
                    postal_code="10001",
                    country="USA",
                )
            ],
            accessibility=[
                Accessibility(
                    id='acc1',
                    description='Wheelchair accessible, Braille signage',
                    details='This location is wheelchair accessible',
                    url='foo.bar/accessibility/acc1',
                )
            ],
        ),
        contacts=[
            Contact(
                id=base_contact_response.id,
                name=base_contact_response.name,
                title=base_contact_response.title,
                department=base_contact_response.department,
                email=base_contact_response.email,
            )
        ],
        phones=[
            Phone(
                id=base_phone_response.id,
                number=base_phone_response.number,
                extension=base_phone_response.extension,
                type=base_phone_response.type,
                description=base_phone_response.description,
            )
        ],
        schedules=[
            Schedule(
                id=base_schedule_response.id,
                valid_from=base_schedule_response.valid_from,
                valid_to=base_schedule_response.valid_to,
                dtstart=base_schedule_response.dtstart,
                timezone=base_schedule_response.timezone,
                freq=base_schedule_response.freq,
                byday=base_schedule_response.byday,
                description=base_schedule_response.description,
                opens_at=base_schedule_response.opens_at,
                closes_at=base_schedule_response.closes_at,
                schedule_link=base_schedule_response.schedule_link,
                attending_type=base_schedule_response.attending_type,
                notes=base_schedule_response.notes,
            )
        ],
    )

@pytest.fixture
def expected_service_at_location_with_no_locations_result(
    service_at_location_response_with_no_locations: ServiceAtLocationResponse,
    base_contact_response: ContactResponse,
    base_phone_response: PhoneResponse,
    base_schedule_response: ScheduleResponse
) -> ServiceAtLocation:
    return ServiceAtLocation(
        id=service_at_location_response_with_no_locations.id,
        service_id=service_at_location_response_with_no_locations.service_id,
        location=None,
        contacts=[
            Contact(
                id=base_contact_response.id,
                name=base_contact_response.name,
                title=base_contact_response.title,
                department=base_contact_response.department,
                email=base_contact_response.email,
            )
        ],
        phones=[
            Phone(
                id=base_phone_response.id,
                number=base_phone_response.number,
                extension=base_phone_response.extension,
                type=base_phone_response.type,
                description=base_phone_response.description,
            )
        ],
        schedules=[
            Schedule(
                id=base_schedule_response.id,
                valid_from=base_schedule_response.valid_from,
                valid_to=base_schedule_response.valid_to,
                dtstart=base_schedule_response.dtstart,
                timezone=base_schedule_response.timezone,
                freq=base_schedule_response.freq,
                byday=base_schedule_response.byday,
                description=base_schedule_response.description,
                opens_at=base_schedule_response.opens_at,
                closes_at=base_schedule_response.closes_at,
                schedule_link=base_schedule_response.schedule_link,
                attending_type=base_schedule_response.attending_type,
                notes=base_schedule_response.notes,
            )
        ],
    )

def _test_data(
    model_class: type[BaseModel],
    example_responses: list[BaseModel],
) -> InMemoryData:
    return InMemoryData(
        model_class=model_class,
        data={
            resp.id: resp for resp in example_responses
        },
    )

@pytest.fixture
def test_service_at_location_data(
    service_at_location_response_with_no_locations: ServiceAtLocationResponse,
    full_service_at_location_response: ServiceAtLocationResponse,
) -> InMemoryData[ServiceAtLocationResponse]:
    return _test_data(
        model_class=ServiceAtLocationResponse,
        example_responses=[
            service_at_location_response_with_no_locations,
            full_service_at_location_response,
        ],
    )

@pytest.fixture
def test_services_data(
    service_response: ServiceResponse,
) -> InMemoryData[ServiceResponse]:
    return _test_data(
        model_class=ServiceResponse,
        example_responses=[service_response],
    )

@pytest.fixture
def test_locations_data(
    base_location_response: LocationResponse,
) -> InMemoryData[LocationResponse]:
    return _test_data(
        model_class=LocationResponse,
        example_responses=[base_location_response],
    )

@pytest.fixture
def test_addresses_data(
    base_address_response: AddressResponse,
) -> InMemoryData[AddressResponse]:
    return _test_data(
        model_class=AddressResponse,
        example_responses=[base_address_response],
    )

@pytest.fixture
def test_contacts_data(
    base_contact_response: ContactResponse,
) -> InMemoryData[ContactResponse]:
    return _test_data(
        model_class=ContactResponse,
        example_responses=[base_contact_response],
    )

@pytest.fixture
def test_phones_data(
    base_phone_response: PhoneResponse,
) -> InMemoryData[PhoneResponse]:
    return _test_data(
        model_class=PhoneResponse,
        example_responses=[base_phone_response],
    )

@pytest.fixture
def test_schedules_data(
    base_schedule_response: ScheduleResponse,
) -> InMemoryData[ScheduleResponse]:
    return _test_data(
        model_class=ScheduleResponse,
        example_responses=[base_schedule_response],
    )

@pytest.fixture
def test_accessibilities_data(
    base_accessibility_response: AccessibilityResponse,
) -> InMemoryData[AccessibilityResponse]:
    return _test_data(
        model_class=AccessibilityResponse,
        example_responses=[base_accessibility_response],
    )

@pytest.fixture
def test_settings() -> Settings:
    # Fixed values, not .env: unit tests must run without credentials.
    return Settings(
        airtable_api_key="test-key",
        airtable_base_id="appTEST0000000000",
        published_status_value="Published",
        _env_file=None,  # type: ignore[call-arg]
    )

@pytest.mark.unit
def test_list_service_at_locations_returns_only_published_services(
    test_service_at_location_data: InMemoryData[ServiceAtLocationResponse],
    test_services_data: InMemoryData[ServiceResponse],
    test_locations_data: InMemoryData[LocationResponse],
    test_addresses_data: InMemoryData[AddressResponse],
    test_contacts_data: InMemoryData[ContactResponse],
    test_phones_data: InMemoryData[PhoneResponse],
    test_schedules_data: InMemoryData[ScheduleResponse],
    test_accessibilities_data: InMemoryData[AccessibilityResponse],
    test_settings: Settings,
    expected_service_at_location_with_locations_result: ServiceAtLocation,
    expected_service_at_location_with_no_locations_result: ServiceAtLocation,
):
    service_at_locations_page = application_layer.list_service_at_locations(
        service_at_locations_table=test_service_at_location_data,
        services_table=test_services_data,
        locations_table=test_locations_data,
        addresses_table=test_addresses_data,
        contacts_table=test_contacts_data,
        phones_table=test_phones_data,
        schedule_table=test_schedules_data,
        accessibilities_table=test_accessibilities_data,
        settings=test_settings,
        full=True,
    )
    service_at_locations_results = service_at_locations_page.contents

    assert len(service_at_locations_results) == 1
    assert any(
        svc.id == expected_service_at_location_with_locations_result.id
        for svc in service_at_locations_results
    )
    assert all(
        svc.id != expected_service_at_location_with_no_locations_result.id
        for svc in service_at_locations_results
    )



@pytest.mark.unit
def test_get_service_at_locations_returns_service_at_location_with_no_locations(
    service_at_location_response_with_no_locations: ServiceAtLocationResponse,
    test_service_at_location_data: InMemoryData[ServiceAtLocationResponse],
    test_locations_data: InMemoryData[LocationResponse],
    test_addresses_data: InMemoryData[AddressResponse],
    test_contacts_data: InMemoryData[ContactResponse],
    test_phones_data: InMemoryData[PhoneResponse],
    test_schedules_data: InMemoryData[ScheduleResponse],
    test_accessibilities_data: InMemoryData[AccessibilityResponse],
    expected_service_at_location_with_no_locations_result: ServiceAtLocation,
):
    result = application_layer.get_service_at_locations(
        sal_id=service_at_location_response_with_no_locations.id,
        service_at_locations_table=test_service_at_location_data,
        locations_table=test_locations_data,
        addresses_table=test_addresses_data,
        contacts_table=test_contacts_data,
        phones_table=test_phones_data,
        schedule_table=test_schedules_data,
        accessibilities_table=test_accessibilities_data,
    )

    assert result.model_dump() == \
        expected_service_at_location_with_no_locations_result.model_dump()


@pytest.mark.unit
def test_get_sal_returns_service_at_location_when_location_is_not_found(
    test_service_at_location_data: InMemoryData[ServiceAtLocationResponse],
    test_locations_data: InMemoryData[LocationResponse],
    test_addresses_data: InMemoryData[AddressResponse],
    test_contacts_data: InMemoryData[ContactResponse],
    test_phones_data: InMemoryData[PhoneResponse],
    test_schedules_data: InMemoryData[ScheduleResponse],
    test_accessibilities_data: InMemoryData[AccessibilityResponse],
    expected_service_at_location_with_no_locations_result: ServiceAtLocation,
):
    result = application_layer.get_service_at_locations(
        sal_id=expected_service_at_location_with_no_locations_result.id,
        service_at_locations_table=test_service_at_location_data,
        locations_table=test_locations_data,
        addresses_table=test_addresses_data,
        contacts_table=test_contacts_data,
        phones_table=test_phones_data,
        schedule_table=test_schedules_data,
        accessibilities_table=test_accessibilities_data,
    )

    assert result.model_dump() == \
        expected_service_at_location_with_no_locations_result.model_dump()

@pytest.mark.unit
def test_get_service_at_locations_returns_none_when_service_at_location_id_is_not_found(
    test_service_at_location_data: InMemoryData[ServiceAtLocationResponse],
    test_locations_data: InMemoryData[LocationResponse],
    test_addresses_data: InMemoryData[AddressResponse],
    test_contacts_data: InMemoryData[ContactResponse],
    test_phones_data: InMemoryData[PhoneResponse],
    test_schedules_data: InMemoryData[ScheduleResponse],
    test_accessibilities_data: InMemoryData[AccessibilityResponse],
):
    result = application_layer.get_service_at_locations(
        sal_id="nonexistent_id",
        service_at_locations_table=test_service_at_location_data,
        locations_table=test_locations_data,
        addresses_table=test_addresses_data,
        contacts_table=test_contacts_data,
        phones_table=test_phones_data,
        schedule_table=test_schedules_data,
        accessibilities_table=test_accessibilities_data,
    )

    assert result is None
