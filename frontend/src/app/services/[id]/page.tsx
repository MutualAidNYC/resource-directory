import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMapService, getOrganization, getService, serviceIds } from '@/lib/data';
import { externalHref, formatAddress } from '@/lib/format';
import { MapContainer } from '@/components/map/MapContainer';
import { ExternalLink, WebsiteLink } from '@/components/ui/ExternalLink';
import { TagLink } from '@/components/ui/TagLink';
import { Icon } from '@/components/ui/Icon';
import { CARD } from '@/lib/styles';

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
    if (!service) return { title: 'Resource Not Found' };
    return {
        title: service.name,
        description: service.description || `Details about ${service.name}`,
    };
}

/**
 * Service detail page showing full service information.
 *
 * The map pin is the first of the service's locations with coordinates (the same
 * pin as on the main map). Categories come from the site's map data.
 */
export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
    const { id } = await params;

    const service = getService(id);
    if (!service) notFound();

    const categories = getMapService(id);
    const needFocus = categories?.needFocus ?? [];
    const communityFocus = categories?.communityFocus ?? [];
    const organization = service.organization_id
        ? getOrganization(service.organization_id)
        : undefined;
    const website = externalHref(service.url);

    // The Locations list: locations with a name or an address. (The build already
    // leaves out service_at_locations that link no location.)
    const places = (service.service_at_locations ?? []).flatMap((sal) => {
        if (!sal.location) return [];
        const addresses = (sal.location.addresses ?? [])
            .map((address) => ({ id: address.id, text: formatAddress(address) }))
            .filter((address) => address.text);
        const name = sal.location.name;
        return name || addresses.length > 0 ? [{ id: sal.id, name, addresses }] : [];
    });

    let mapCoords: { latitude: number; longitude: number; name: string; address?: string } | null =
        null;
    const pinned = service.service_at_locations?.find(
        (sal) => sal.location?.latitude && sal.location?.longitude,
    )?.location;
    if (pinned?.latitude && pinned.longitude) {
        const addr = pinned.addresses?.[0];
        mapCoords = {
            latitude: pinned.latitude,
            longitude: pinned.longitude,
            name: pinned.name || service.name,
            address: addr ? formatAddress(addr) || undefined : undefined,
        };
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm">
                <ol className="flex items-center gap-2 text-muted">
                    <li>
                        <Link href="/" className="hover:text-foreground hover:underline">
                            Home
                        </Link>
                    </li>
                    <span>/</span>
                    <li>
                        <Link href="/services" className="hover:text-foreground hover:underline">
                            Resources
                        </Link>
                    </li>
                    <span>/</span>
                    <li className="text-foreground font-medium truncate">{service.name}</li>
                </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h1 className="text-3xl">{service.name}</h1>
                        </div>

                        {/* Group, linked to its page */}
                        {organization && (
                            <p className="text-lg mb-4">
                                <span className="font-medium">Group:</span>{' '}
                                <Link
                                    href={`/organizations/${organization.id}`}
                                    className="text-accent hover:text-accent-hover underline hover:no-underline"
                                >
                                    {organization.name}
                                </Link>
                            </p>
                        )}

                        {/* Need Categories */}
                        {needFocus.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-semibold opacity-70 mb-2 uppercase tracking-wide">
                                    Need Categories
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {needFocus.map((need, index) => (
                                        <TagLink
                                            key={`need-${index}`}
                                            href={`/services?category=${encodeURIComponent(need)}`}
                                            colorScheme="coral"
                                        >
                                            {need}
                                        </TagLink>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Community Focus */}
                        {communityFocus.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-semibold opacity-70 mb-2 uppercase tracking-wide">
                                    Community Focus
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {communityFocus.map((community, index) => (
                                        <TagLink
                                            key={`community-${index}`}
                                            href={`/services?community=${encodeURIComponent(community)}`}
                                            colorScheme="olive"
                                        >
                                            {community}
                                        </TagLink>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {service.description && (
                        <section>
                            <h2 className="text-xl mb-4">Description</h2>
                            <p className="whitespace-pre-wrap">{service.description}</p>
                        </section>
                    )}

                    {/* Locations */}
                    {places.length > 0 && (
                        <section>
                            <h2 className="text-xl mb-4">Locations</h2>
                            <div className="space-y-4">
                                {places.map(({ id, name, addresses }) => (
                                    <div
                                        key={id}
                                        className="rounded-xl border border-card-border p-4"
                                    >
                                        {name && <h3 className="mb-2">{name}</h3>}
                                        {addresses.length > 0 && (
                                            <div>
                                                {addresses.map((address) => (
                                                    <p key={address.id}>{address.text}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {/* Map Card - show if service has geocoded coordinates */}
                        {mapCoords && (
                            <div className={`${CARD} overflow-hidden`}>
                                <div className="rounded-xl overflow-hidden border border-card-border h-64">
                                    <MapContainer
                                        locations={[
                                            {
                                                id: service.id,
                                                name: mapCoords.name,
                                                latitude: mapCoords.latitude,
                                                longitude: mapCoords.longitude,
                                            },
                                        ]}
                                    />
                                </div>
                                {mapCoords.address && (
                                    <div className="p-4 border-t border-card-border">
                                        <p className="text-sm mb-2">{mapCoords.address}</p>
                                        <ExternalLink
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapCoords.address)}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
                                        >
                                            <Icon name="pin" className="w-4 h-4" />
                                            Get Directions
                                        </ExternalLink>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contact Card */}
                        <div className={`${CARD} p-6`}>
                            <h3 className="mb-4">Contact Information</h3>

                            <div className="space-y-4">
                                {website && (
                                    <div className="flex items-center gap-3">
                                        <Icon name="link" className="w-5 h-5 shrink-0" />
                                        <span className="min-w-0">
                                            <WebsiteLink
                                                href={website}
                                                name={service.name}
                                                className="text-accent hover:text-accent-hover underline hover:no-underline"
                                            />
                                        </span>
                                    </div>
                                )}

                                {service.email && (
                                    <a
                                        href={`mailto:${service.email}`}
                                        className="flex items-center gap-3 text-foreground hover:text-accent"
                                    >
                                        <Icon
                                            name="email"
                                            label="email"
                                            className="w-5 h-5 shrink-0"
                                        />
                                        <span className="truncate underline hover:no-underline">
                                            {service.email}
                                        </span>
                                    </a>
                                )}

                                {service.phones?.map((phone) => (
                                    <div key={phone.id} className="flex items-center gap-3">
                                        <Icon
                                            name="phone"
                                            label="phone"
                                            className="w-5 h-5 shrink-0"
                                        />
                                        <span>
                                            <a
                                                href={`tel:${phone.number}`}
                                                className="hover:text-foreground underline hover:no-underline"
                                            >
                                                {phone.number}
                                            </a>
                                        </span>
                                    </div>
                                ))}

                                {!website &&
                                    !service.email &&
                                    (service.phones?.length ?? 0) === 0 && (
                                        <p className="text-muted text-sm">
                                            No contact information available.
                                        </p>
                                    )}
                            </div>
                        </div>

                        {/* Back Button */}
                        <Link href="/services" className="btn btn-secondary w-full gap-2">
                            <Icon name="chevron-left" className="w-4 h-4" />
                            Back to All Resources
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
