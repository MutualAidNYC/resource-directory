import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMapService, getOrganization, getService, serviceIds } from '@/lib/data';
import { externalHref } from '@/lib/format';
import { MapAside } from '@/components/map/MapAside';
import type { MapLocation } from '@/components/map/MapView';
import { ContactList } from '@/components/ui/ContactList';
import { TagList } from '@/components/ui/TagList';
import { Icon } from '@/components/ui/Icon';
import { BackLink } from '@/components/ui/BackLink';
import { BRAND_LABEL, PAGE } from '@/lib/styles';

interface ServiceDetailPageProps {
    params: Promise<{ id: string }>;
}

/** One page per published resource; any other id is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
    return serviceIds().map((id) => ({ id }));
}

/**
 * Generate dynamic metadata for service detail page.
 */
export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const service = getService(id);
    if (!service) return { title: 'Resource not found' };
    return {
        title: service.name,
        description: service.description || `Details about ${service.name}`,
    };
}

/**
 * Service detail page: a full-width head (name, organization, contact information), then
 * "About this resource" and "Who it's for" beside a map of its locations. Services with
 * no location (hotlines, online, citywide) get no map and one column.
 */
export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
    const { id } = await params;

    const service = getService(id);
    if (!service) notFound();

    const categories = getMapService(id);
    const needFocus = categories?.needFocus ?? [];
    const communityFocus = categories?.communityFocus ?? [];
    const areas = categories?.service_areas ?? [];
    const organization = service.organization_id
        ? getOrganization(service.organization_id)
        : undefined;

    // Every location in link order (the build leaves out service_at_locations that
    // link no location), for the addresses and a pin for each with coordinates.
    const locations = (service.service_at_locations ?? []).flatMap((sal) =>
        sal.location ? [sal.location] : [],
    );
    const pins: MapLocation[] = locations.flatMap((loc) =>
        loc.latitude && loc.longitude
            ? [
                  {
                      id: loc.id,
                      name: loc.name || service.name,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                  },
              ]
            : [],
    );

    return (
        <div className={`${PAGE} pt-10 pb-16`}>
            <p className={`${BRAND_LABEL} text-[15px] mb-2`}>Resource</p>
            <h1>{service.name}</h1>

            {/* Group, linked to its page */}
            {organization && (
                <p className="mt-4 text-lg flex items-start gap-2">
                    <Icon name="group" className="w-5 h-5 mt-1 shrink-0" />
                    <span>
                        Group:{' '}
                        <Link
                            href={`/organizations/${organization.id}`}
                            className="text-accent hover:text-accent-hover underline hover:no-underline"
                        >
                            {organization.name}
                        </Link>
                    </span>
                </p>
            )}

            <ContactList
                name={service.name}
                website={externalHref(service.url)}
                phones={(service.phones ?? []).map((phone) => phone.number)}
                email={service.email}
                locations={locations}
            />

            <div
                className={`mt-10 grid gap-10 ${pins.length > 0 ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-12' : ''}`}
            >
                <div className="space-y-10">
                    {service.description && (
                        <section>
                            <h2 className="mb-4">About this resource</h2>
                            <p className="max-w-prose text-lg whitespace-pre-wrap">
                                {service.description}
                            </p>
                        </section>
                    )}

                    {needFocus.length + communityFocus.length + areas.length > 0 && (
                        <section>
                            <h2 className="mb-4">Who it&apos;s for</h2>
                            <div className="space-y-6">
                                {needFocus.length > 0 && (
                                    <div>
                                        <p className={`${BRAND_LABEL} text-sm mb-2`}>
                                            Type of help
                                        </p>
                                        <TagList
                                            name={service.name}
                                            tags={needFocus.map((tag) => ({
                                                kind: 'need',
                                                name: tag,
                                            }))}
                                        />
                                    </div>
                                )}
                                {communityFocus.length > 0 && (
                                    <div>
                                        <p className={`${BRAND_LABEL} text-sm mb-2`}>Community</p>
                                        <TagList
                                            name={service.name}
                                            tags={communityFocus.map((tag) => ({
                                                kind: 'community',
                                                name: tag,
                                            }))}
                                        />
                                    </div>
                                )}
                                {areas.length > 0 && (
                                    <div>
                                        <p className={`${BRAND_LABEL} text-sm mb-2`}>Area</p>
                                        <p>{areas.join(', ')}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <BackLink list="/services">Back to all resources</BackLink>
                </div>

                {pins.length > 0 && <MapAside locations={pins} />}
            </div>
        </div>
    );
}
