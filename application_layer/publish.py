"""What the build may publish.

Every output is built from `Published`, never from a whole table, so nothing
reaches the site or API unless it hangs off a published service:

- Services: every pulled service. The services `filter` in airtable.toml
  decides which services the pull returns, so it is the publish guard.
- Organizations: only those linked from a published service. Organizations the
  organizations `filter` in airtable.toml leaves out are never pulled, so they never appear.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from data_layer.dataset import Dataset
from models.airtable import OrganizationResponse, ServiceResponse

@dataclass(frozen=True)
class Published:
    services: list[ServiceResponse]  # in pull order
    organizations: dict[str, OrganizationResponse]  # record id → organization, in pull order
    organization_of: dict[str, str]  # service record id → its organization's record id
    # Published services whose organizations the pull skipped: listed in the build report.
    without_organization: list[str] = field(default_factory=list)

    def organization_for(self, service: ServiceResponse) -> OrganizationResponse | None:
        """The service's published organization, or None if it has none."""
        return self.organizations.get(self.organization_of.get(service.id, ""))

    def services_of(self, organization_id: str) -> list[ServiceResponse]:
        """The organization's published services, in pull order."""
        return [s for s in self.services if self.organization_of.get(s.id) == organization_id]


def select(dataset: Dataset) -> Published:
    """Collect what to publish: the pulled services and the organizations they link to."""
    services = dataset.services.all()
    organization_of: dict[str, str] = {}
    without_organization: list[str] = []
    for service in services:
        # A service has one organization. If it links several, the first one in its own
        # list (that the pull kept) wins and the others don't count it.
        organization = next(
            (o for o in service.organizations or [] if dataset.organizations.get(o)), None
        )
        if organization is None:
            without_organization.append(service.id)
            continue
        organization_of[service.id] = organization

    linked = set(organization_of.values())
    organizations = {o.id: o for o in dataset.organizations.all() if o.id in linked}
    return Published(
        services=services,
        organizations=organizations,
        organization_of=organization_of,
        without_organization=without_organization,
    )
