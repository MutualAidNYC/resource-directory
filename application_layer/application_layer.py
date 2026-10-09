
from config import Settings
from data_layer.data import DataEntity, Filter
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
    Page,
    Phone,
    Schedule,
    ServiceAtLocation,
)

def list_service_at_locations(
    service_at_locations_table: DataEntity[ServiceAtLocationResponse],
    services_table: DataEntity[ServiceResponse],
    locations_table: DataEntity[LocationResponse],
    addresses_table: DataEntity[AddressResponse],
    contacts_table: DataEntity[ContactResponse],
    phones_table: DataEntity[PhoneResponse],
    schedule_table: DataEntity[ScheduleResponse],
    accessibilities_table: DataEntity[AccessibilityResponse],
    settings: Settings,
    page: int = 1,
    per_page: int = 20,
    full: bool = False,
) -> Page:
    services_at_locations = service_at_locations_table.list()
    services = services_table.list(
        filters=[
            Filter(
                key="status",
                value=settings.published_status_value,
            )
        ]
    )
    published_service_ids = set(svc.id for svc in services)

    results = []
    for sal in services_at_locations:
        if sal.service_id not in published_service_ids:
            continue

        res = _create_service_at_location_result(
            service_at_location_response=sal,
            locations_table=locations_table,
            addresses_table=addresses_table,
            contacts_table=contacts_table,
            phones_table=phones_table,
            schedule_table=schedule_table,
            accessibilities_table=accessibilities_table,
        )
        results.append(res)

    return _paginate_results(results=results, page=page, per_page=per_page)


def get_service_at_locations(
    sal_id: str,
    service_at_locations_table: DataEntity[ServiceAtLocationResponse],
    locations_table: DataEntity[LocationResponse],
    addresses_table: DataEntity[AddressResponse],
    contacts_table: DataEntity[ContactResponse],
    phones_table: DataEntity[PhoneResponse],
    schedule_table: DataEntity[ScheduleResponse],
    accessibilities_table: DataEntity[AccessibilityResponse],
) -> ServiceAtLocation | None:
    service_at_locations = service_at_locations_table.get(id=sal_id)
    if not service_at_locations:
        return None

    return _create_service_at_location_result(
        service_at_location_response=service_at_locations,
        locations_table=locations_table,
        addresses_table=addresses_table,
        contacts_table=contacts_table,
        phones_table=phones_table,
        schedule_table=schedule_table,
        accessibilities_table=accessibilities_table,
    )

def _create_service_at_location_result(
    service_at_location_response: ServiceAtLocationResponse,
    locations_table: DataEntity[LocationResponse],
    addresses_table: DataEntity[AddressResponse],
    contacts_table: DataEntity[ContactResponse],
    phones_table: DataEntity[PhoneResponse],
    schedule_table: DataEntity[ScheduleResponse],
    accessibilities_table: DataEntity[AccessibilityResponse],
) -> ServiceAtLocation:
    contact_responses = contacts_table.get_bulk(ids=service_at_location_response.contacts) \
        if service_at_location_response.contacts else None
    phone_responses = phones_table.get_bulk(ids=service_at_location_response.phones) \
        if service_at_location_response.phones else None
    schedule_responses = schedule_table.get_bulk(ids=service_at_location_response.schedules) \
        if service_at_location_response.schedules else None

    contacts = [
        Contact(**contact_response.model_dump())
        for contact_response in contact_responses
    ] if contact_responses else None
    phones = [
        Phone(**phone_response.model_dump())
        for phone_response in phone_responses
    ] if phone_responses else None
    schedules = [
        Schedule(**schedule_response.model_dump())
        for schedule_response in schedule_responses
    ] if schedule_responses else None

    if not service_at_location_response.locations:
        return ServiceAtLocation(
            id=service_at_location_response.id,
            service_id=service_at_location_response.service_id,
            location=None,
            contacts=contacts,
            phones=phones,
            schedules=schedules,
        )

    location = locations_table.get(id=service_at_location_response.locations[0]) \
        if service_at_location_response and service_at_location_response.locations else None

    if not location:
        return ServiceAtLocation(
            id=service_at_location_response.id,
            service_id=service_at_location_response.service_id,
            location=None,
            contacts=contacts,
            phones=phones,
            schedules=schedules,
        )

    address_responses = addresses_table.get_bulk(ids=location.addresses) \
        if location.addresses else None
    accessibily_responses = accessibilities_table.get_bulk(ids=location.accessibility) \
        if location.accessibility else None

    addresses = [
        Address(**address_response.model_dump())
        for address_response in address_responses
    ] if address_responses else None

    accessibilities = [
        Accessibility(**accessibility_response.model_dump())
        for accessibility_response in accessibily_responses
    ] if accessibily_responses else None

    location_response = Location(
        id=location.id,
        location_type=location.location_type,
        url=location.url,
        name=location.name,
        alternate_name=location.alternate_name,
        description=location.description,
        transportation=location.transportation,
        latitude=location.latitude,
        longitude=location.longitude,
        external_identifier=location.external_identifier,
        external_identifier_type=location.external_identifier_type,
        addresses=addresses,
        phones=phones,
        contacts=contacts,
        accessibility=accessibilities,
        languages=None, # TODO: Add languages to location model and response
        schedules=schedules,
    )

    return ServiceAtLocation(
        id=service_at_location_response.id,
        service_id=service_at_location_response.service_id,
        location=location_response,
        contacts=contacts,
        phones=phones,
        schedules=schedules,
    )

def _paginate_results(results: list[ServiceAtLocation], page: int, per_page: int) -> Page:
    total = len(results)
    total_pages = max(1, (total + per_page - 1) // per_page)

    start = (page - 1) * per_page
    end = start + per_page
    page_items = results[start:end]

    return Page(
        total_items=total,
        total_pages=total_pages,
        page_number=page,
        size=len(page_items),
        first_page=(page == 1),
        last_page=(page >= total_pages),
        empty=(len(page_items) == 0),
        contents=page_items,
    )
