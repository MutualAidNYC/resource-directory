"""Sample Airtable pull for the application_layer tests.

Airtable's own shapes (links and multi-selects as lists), with fake record ids.
Fixtures built from it are in conftest.py.
"""
import re
from typing import Any

FRIDGE = "recFridge00000001"
HOTLINE = "recHotline0000001"
ORPHAN = "recOrphan00000001"  # its only organization was skipped by the pull
ORG = "recOrgA0000000001"
QUIET_ORG = "recQuietOrg000001"  # no published services
SKIPPED_ORG = "recSkippedOrg0001"  # not in the pull ("Do Not Publish")
SAL_FRIDGE = "recSalFridge00001"
SAL_HOTLINE = "recSalHotline0001"
HALL = "recLocHall0000001"
ADDRESS = "recAddress0000001"
PHONE_FRIDGE = "recPhoneFridge001"
PHONE_ORG = "recPhoneOrg000001"
DELETED_PHONE = "recPhoneDeleted01"
SPANISH = "recLangSpanish001"
BROOKLYN = "recAreaBrooklyn01"
CITYWIDE = "recAreaCitywide01"
NEED = "recTaxNeed0000001"
COMMUNITY = "recTaxCommunity01"
FOOD = "recTermFood000001"
SENIORS = "recTermSeniors001"
LEGAL = "recTermLegal00001"  # used by no published service
NOT_LISTED = "recTermNotListed1"

RECORD_ID = re.compile(r"rec[A-Za-z0-9]{14}")  # Airtable's record id format


def rec(record_id: str, **fields: object) -> dict[str, Any]:
    return {"id": record_id, "fields": fields}


def pull() -> dict[str, list[dict[str, Any]]]:
    return {
        "services": [
            rec(
                FRIDGE,
                name="Fridge",
                description="Free food",
                url="https://fridge.example.org",
                email="fridge@example.org",
                assured_date="2026-01-02",
                needFocus=["Food", "-Not Listed"],
                communityFocus=["Seniors"],
                organizations=[ORG],
                phones=[PHONE_FRIDGE, DELETED_PHONE],
                languages=[SPANISH],
                service_areas=[BROOKLYN, CITYWIDE],
                service_at_locations=[SAL_FRIDGE],
            ),
            rec(
                HOTLINE,
                name="Hotline",
                needFocus=["Mystery"],
                organizations=[ORG],
                service_at_locations=[SAL_HOTLINE],
            ),
            rec(ORPHAN, name="Orphan", organizations=[SKIPPED_ORG]),
        ],
        "organizations": [
            rec(QUIET_ORG, name="Quiet org"),
            rec(
                ORG,
                name="org A",
                description="Neighbors helping neighbors",
                website="https://org.example.org",
                phones=[PHONE_ORG],
                locations=[HALL],
            ),
        ],
        "service_at_location": [
            rec(SAL_FRIDGE, services=[FRIDGE], locations=[HALL]),
            rec(SAL_HOTLINE, services=[HOTLINE]),  # hotline: no location on purpose
        ],
        "locations": [
            rec(
                HALL,
                name="Community Hall",
                location_type=["physical"],
                latitude=40.7,
                longitude=-73.9,
                addresses=[ADDRESS],
            )
        ],
        "addresses": [
            rec(
                ADDRESS,
                address_1="1 Main St",
                city="New York",
                state_province="NY",
                postal_code="10001",
                country="US",
                address_type=["physical"],
            )
        ],
        "phones": [rec(PHONE_FRIDGE, number="555-0100"), rec(PHONE_ORG, number="555-0200")],
        "languages": [rec(SPANISH, name="Spanish", code="es")],
        "service_areas": [
            rec(BROOKLYN, name="Brooklyn", **{"x-order": 3}),
            rec(CITYWIDE, name="New York City (all boroughs)", **{"x-order": 1}),
        ],
        "taxonomies": [
            rec(NEED, name="MANYC Need", description="Needs"),
            rec(COMMUNITY, name="MANYC Community Focus"),
        ],
        "taxonomy_terms": [
            rec(FOOD, name="Food", taxonomy=[NEED]),
            rec(SENIORS, name="Seniors", taxonomy=[COMMUNITY]),
            rec(LEGAL, name="Legal", taxonomy=[NEED]),
            rec(NOT_LISTED, name="-Not Listed"),
        ],
    }


def record_ids_in(value: object) -> list[str]:
    """Airtable record ids anywhere in a dumped output (must be none)."""
    if isinstance(value, dict):
        return [i for k, v in value.items() for i in record_ids_in(k) + record_ids_in(v)]
    if isinstance(value, list):
        return [i for v in value for i in record_ids_in(v)]
    return [value] if isinstance(value, str) and RECORD_ID.fullmatch(value) else []
