import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMapService, getOrganization, getService, serviceIds } from "@/lib/data";
import { externalHref, formatAddress } from "@/lib/format";
import ServiceLocationMap from "./ServiceLocationMap";
import { TagLink } from "@/components/ui/TagLink";

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
    if (!service) return { title: "Service Not Found" };
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

    let mapCoords: { latitude: number; longitude: number; name: string; address?: string } | null = null;
    const pinned = service.service_at_locations?.find(
        (sal) => sal.location?.latitude && sal.location?.longitude
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
                <ol className="flex items-center gap-2 text-[var(--muted)]">
                    <li>
                        <Link href="/" className="hover:text-[var(--foreground)] hover:underline">
                            Home
                        </Link>
                    </li>
                    <span>/</span>
                    <li>
                        <Link href="/services" className="hover:text-[var(--foreground)] hover:underline">
                            Resources
                        </Link>
                    </li>
                    <span>/</span>
                    <li className="text-[var(--foreground)] font-medium truncate">
                        {service.name}
                    </li>
                </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h1 className="text-3xl font-bold text-[var(--foreground)]">
                                {service.name}
                            </h1>
                        </div>

                        {/* Group, linked to its page */}
                        {organization && (
                            <p className="text-lg text-[var(--foreground)] mb-4">
                                <span className="font-medium">Group:</span>{' '}
                                <Link
                                    href={`/organizations/${organization.id}`}
                                    className="text-[var(--primary)] hover:text-[var(--primary-hover)] underline hover:no-underline"
                                >
                                    {organization.name}
                                </Link>
                            </p>
                        )}

                        {/* Need Categories */}
                        {needFocus.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-[var(--foreground)] opacity-70 mb-2 uppercase tracking-wide">
                                    Need Categories
                                </h3>
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
                                <h3 className="text-sm font-semibold text-[var(--foreground)] opacity-70 mb-2 uppercase tracking-wide">
                                    Community Focus
                                </h3>
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
                            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                                Description
                            </h2>
                            <div className="prose max-w-none">
                                <p className="text-[var(--foreground)] whitespace-pre-wrap">
                                    {service.description}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Locations */}
                    {places.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                                Locations
                            </h2>
                            <div className="space-y-4">
                                {places.map(({ id, name, addresses }) => (
                                    <div
                                        key={id}
                                        className="rounded-xl border border-[var(--card-border)] p-4"
                                    >
                                        {name && (
                                            <h3 className="font-medium text-[var(--foreground)] mb-2">
                                                {name}
                                            </h3>
                                        )}
                                        {addresses.length > 0 && (
                                            <div className="text-[var(--foreground)]">
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
                            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
                                <ServiceLocationMap
                                    latitude={mapCoords.latitude}
                                    longitude={mapCoords.longitude}
                                    name={mapCoords.name}
                                />
                                {mapCoords.address && (
                                    <div className="p-4 border-t border-[var(--card-border)]">
                                        <p className="text-sm text-[var(--foreground)] mb-2">
                                            {mapCoords.address}
                                        </p>
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapCoords.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                                        >
                                            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Get Directions
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contact Card */}
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                            <h3 className="font-semibold text-[var(--foreground)] mb-4">
                                Contact Information
                            </h3>

                            <div className="space-y-4">
                                {website && (
                                    <a
                                        href={website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 text-[var(--primary)] hover:text-[var(--primary-hover)]"
                                    >
                                        <svg className="w-5 h-5 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        <span className="truncate underline hover:no-underline">Visit Website</span>
                                    </a>
                                )}

                                {service.email && (
                                    <a
                                        href={`mailto:${service.email}`}
                                        className="flex items-center gap-3 text-[var(--foreground)] hover:text-[var(--primary)]"
                                    >
                                        <svg className="w-5 h-5 shrink-0" role="img" aria-label="email" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate underline hover:no-underline">{service.email}</span>
                                    </a>
                                )}

                                {service.phones?.map((phone) => (
                                    <div key={phone.id} className="flex items-center gap-3 text-[var(--foreground)]">
                                        <svg className="w-5 h-5 shrink-0" role="img" aria-label="phone" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>
                                            <a href={`tel:${phone.number}`} className="hover:text-[var(--foreground)] underline hover:no-underline">
                                                {phone.number}
                                            </a>
                                            {phone.extension && <span className="text-sm border-l border-[var(--card-border)] ml-2 pl-2">ext {phone.extension}</span>}
                                            {phone.type && <span className="text-sm opacity-70 ml-2">({phone.type})</span>}
                                        </span>
                                    </div>
                                ))}

                                {!website && !service.email && (service.phones?.length ?? 0) === 0 && (
                                    <p className="text-[var(--muted)] text-sm">
                                        No contact information available.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Back Button */}
                        <Link
                            href="/services"
                            className="btn btn-secondary w-full gap-2"
                        >
                            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to All Resources
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
