"""Address formatting for the map data."""
from typing import Any

# HSDS address fields in display order. address_2 carries floor / suite detail
_DISPLAY_PARTS = ("address_1", "address_2", "city", "state_province", "postal_code")


def format_address(fields: dict[str, Any]) -> str:
    """Join an Airtable address record's fields into one display string.

    Missing and empty parts are skipped. Values are whitespace-normalised
    because some address fields can be long-text fields in Airtable (in Mutual
    Aid NYC's base: `city`, `state_province`, `postal_code`) and carry stray
    newlines that would break a one-line address.
    """
    parts = []
    for key in _DISPLAY_PARTS:
        value = fields.get(key)
        if value is None:
            continue
        text = " ".join(str(value).split())
        if text:
            parts.append(text)
    return ", ".join(parts)
