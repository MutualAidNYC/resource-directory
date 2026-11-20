import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMapData, getOrganization, organizationIds, servicesOf } from '@/lib/data';
import { externalHref, formatAddress } from '@/lib/format';
import { ServiceCard } from '@/components/services/ServiceCard';
import { MapAside } from '@/components/map/MapAside';
import type { MapLocation } from '@/components/map/MapView';
import { ContactList } from '@/components/ui/ContactList';
import { BackLink } from '@/components/ui/BackLink';
import { BRAND_LABEL, PAGE } from '@/lib/styles';

interface OrganizationDetailPageProps {
    params: Promise<{ id: string }>;
}

/** One page per published group; any other id is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
    return organizationIds().map((id) => ({ id }));
}

/**
 * Generate dynamic metadata for group detail page.
 */
export async function generateMetadata({ params }: OrganizationDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const organization = getOrganization(id);
    if (!organization) return { title: 'Group not found' };
    return {
        title: organization.name,
        description: organization.description || `Resources provided by ${organization.name}`,
    };
}

/** A service's first address, for its card (the build keeps link order). */
function firstAddress(service: ReturnType<typeof servicesOf>[number]): string | undefined {
    const address = service.service_at_locations
        ?.flatMap((sal) => sal.location?.addresses ?? [])
        .find((a) => formatAddress(a));
    return address ? formatAddress(address) : undefined;
}

/**
 * Group detail page: a full-width head (name, contact information with the group's own
 * address), then "About this group" and its resources beside a map of them.
 */
export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
    const { id } = await params;

    const organization = getOrganization(id);
    if (!organization) notFound();

    const relatedServices = servicesOf(id);

    // Pins: the group's resources that have one on the main map.
    const serviceIds = new Set(relatedServices.map((s) => s.id));
    let mapLocations: MapLocation[] = getMapData()
        .services.filter((s) => serviceIds.has(s.id) && s.latitude && s.longitude)
        .map((s) => ({
            id: s.id,
            name: s.name,
            latitude: s.latitude!,
            longitude: s.longitude!,
            href: `/services/${s.id}`,
        }));

    // Fallback: if none of its resources has a pin, pin the group's own locations.
    if (mapLocations.length === 0 && organization.locations?.length) {
        mapLocations = organization.locations
            .filter((loc) => loc.latitude && loc.longitude)
            .map((loc) => ({
                id: loc.id,
                name: organization.name,
                latitude: loc.latitude!,
                longitude: loc.longitude!,
            }));
    }

    return (
        <div className={`${PAGE} pt-10 pb-16`}>
            <p className={`${BRAND_LABEL} text-[15px] mb-2`}>Group</p>
            <h1>{organization.name}</h1>

            <ContactList
                name={organization.name}
                website={externalHref(organization.website)}
                phones={(organization.phones ?? []).map((phone) => phone.number)}
                email={organization.email}
                // The group's own addresses only; never one borrowed from its resources.
                locations={organization.locations ?? []}
            />

            <div
                className={`mt-10 grid gap-10 ${mapLocations.length > 0 ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-12' : ''}`}
            >
                <div className="space-y-10">
                    {organization.description && (
                        <section>
                            <h2 className="mb-4">About this group</h2>
                            <p className="max-w-prose text-lg whitespace-pre-wrap">
                                {organization.description}
                            </p>
                        </section>
                    )}

                    <section>
                        <h2 className="mb-4">Resources ({relatedServices.length})</h2>

                        {relatedServices.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {relatedServices.map((service) => (
                                    <ServiceCard
                                        key={service.id}
                                        id={service.id}
                                        name={service.name}
                                        description={service.description}
                                        url={service.url}
                                        address={firstAddress(service)}
                                        phones={service.phones?.map((phone) => phone.number)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-section-alt">
                                <p className="text-muted">
                                    No resources listed for this group yet.
                                </p>
                            </div>
                        )}
                    </section>

                    <BackLink list="/organizations">Back to groups</BackLink>
                </div>

                {mapLocations.length > 0 && <MapAside locations={mapLocations} />}
            </div>
        </div>
    );
}
