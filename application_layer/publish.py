"""What the build may publish.

Every output is built from `Published`, never from a whole table, so nothing
reaches the site or API unless it hangs off a published service:

- Services: every pulled service. The services `filter` in airtable.toml
  decides which services the pull returns, so it is the publish guard.
- Organizations: only those linked from a published service. Organizations the pull skipped
  ("Do Not Publish") are absent from the dataset, so they never appear.

Ids here are Airtable record ids. Public ids are made at output time
(data_layer/ids.py).
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
    service_counts: dict[str, int]  # organization record id → published services
    # Published services whose organizations the pull skipped: listed in the build report.
    without_organization: list[str] = field(default_factory=list)

    def services_of(self, organization_id: str) -> list[ServiceResponse]:
        """The organization's published services, in pull order."""
        return [s for s in self.services if self.organization_of.get(s.id) == organization_id]


def select(dataset: Dataset) -> Published:
    """Collect what to publish: the pulled services and the organizations they link to."""
    services = dataset.services.list()
    organization_of: dict[str, str] = {}
    counts: dict[str, int] = {}
    without_organization: list[str] = []
    for service in services:
        # A service has one organization. If it links several, the first one in the pull
        # wins and the others don't count it.
        organization = next(
            (o for o in service.organizations or [] if dataset.organizations.get(o)), None
        )
        if organization is None:
            without_organization.append(service.id)
            continue
        organization_of[service.id] = organization
        counts[organization] = counts.get(organization, 0) + 1

    organizations = {o.id: o for o in dataset.organizations.list() if o.id in counts}
    return Published(services, organizations, organization_of, counts, without_organization)
