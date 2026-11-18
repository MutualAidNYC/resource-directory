import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMapData, getOrganization, organizationIds, servicesOf } from '@/lib/data';
import { externalHref, formatAddress } from '@/lib/format';
import { ServiceCard } from '@/components/services/ServiceCard';
import { MapContainer } from '@/components/map/MapContainer';
import { WebsiteLink } from '@/components/ui/ExternalLink';
import type { MapLocation } from '@/components/map/MapView';

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
    if (!organization) return { title: 'Group Not Found' };
    return {
        title: organization.name,
        description: organization.description || `Resources provided by ${organization.name}`,
    };
}

/**
 * Group detail page showing group info and its resources.
 * Two-column layout: Left (info + resources), Right (multi-pin map)
 */
export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
    const { id } = await params;

    const organization = getOrganization(id);
    if (!organization) notFound();

    const relatedServices = servicesOf(id);
    const website = externalHref(organization.website);
    // The group's own addresses, listed as text in the contact card.
    const addresses = (organization.locations ?? [])
        .flatMap((loc) => loc.addresses ?? [])
        .filter((address) => formatAddress(address));

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
    let mapLocationLabel = 'Resource Locations';

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
        // Pins came from the group's address, not a specific resource
        mapLocationLabel = 'Group Locations';
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
                        <Link
                            href="/organizations"
                            className="hover:text-foreground hover:underline"
                        >
                            Groups
                        </Link>
                    </li>
                    <span>/</span>
                    <li className="text-foreground font-medium truncate">{organization.name}</li>
                </ol>
            </nav>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Group Info and Resources */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Group Header */}
                    <div>
                        {/* Name */}
                        <h1 className="text-3xl font-bold text-foreground mb-4">
                            {organization.name}
                        </h1>

                        {/* Description */}
                        {organization.description && (
                            <section className="mb-8 mt-6">
                                <h2 className="text-xl font-semibold text-foreground mb-4">
                                    Description
                                </h2>
                                <div className="prose max-w-none">
                                    <p className="text-foreground whitespace-pre-wrap">
                                        {organization.description}
                                    </p>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Resources Section */}
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-6">
                            Resources ({relatedServices.length})
                        </h2>

                        {relatedServices.length > 0 ? (
                            <div className="space-y-4">
                                {relatedServices.map((service) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-section-alt rounded-xl">
                                <p className="text-muted">
                                    No resources listed for this group yet.
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column - Map with all service locations */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {mapLocations.length > 0 ? (
                            <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
                                <div className="p-4 border-b border-card-border">
                                    <h3 className="font-semibold text-foreground">
                                        {mapLocationLabel} ({mapLocations.length})
                                    </h3>
                                </div>
                                <div className="h-[300px]">
                                    <MapContainer locations={mapLocations} />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-card-border bg-section-alt p-8 text-center">
                                <svg
                                    className="w-12 h-12 mx-auto text-muted mb-3"
                                    aria-hidden="true"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <p className="text-muted">No location data available</p>
                            </div>
                        )}

                        {/* Contact Card */}
                        <div className="rounded-xl border border-card-border bg-card-bg p-6">
                            <h3 className="font-semibold text-foreground mb-4">
                                Contact Information
                            </h3>

                            <div className="space-y-4">
                                {website && (
                                    <div className="flex items-center gap-3">
                                        <svg
                                            className="w-5 h-5 shrink-0"
                                            aria-hidden="true"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                            />
                                        </svg>
                                        <span className="min-w-0">
                                            <WebsiteLink
                                                href={website}
                                                name={organization.name}
                                                className="text-accent hover:text-accent-hover underline hover:no-underline"
                                            />
                                        </span>
                                    </div>
                                )}

                                {organization.email && (
                                    <a
                                        href={`mailto:${organization.email}`}
                                        className="flex items-center gap-3 text-foreground hover:text-accent"
                                    >
                                        <svg
                                            className="w-5 h-5 shrink-0"
                                            role="img"
                                            aria-label="email"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span className="truncate">{organization.email}</span>
                                    </a>
                                )}

                                {addresses.map((address) => (
                                    <div
                                        key={address.id}
                                        className="flex items-start gap-3 text-foreground"
                                    >
                                        <svg
                                            className="w-5 h-5 shrink-0 mt-0.5"
                                            role="img"
                                            aria-label="address"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        <address className="not-italic">
                                            {formatAddress(address)}
                                        </address>
                                    </div>
                                ))}

                                {!website && !organization.email && addresses.length === 0 && (
                                    <p className="text-muted text-sm">
                                        No contact information available.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Back Button */}
                        <Link href="/organizations" className="btn btn-secondary w-full gap-2">
                            <svg
                                className="w-4 h-4"
                                aria-hidden="true"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            Back to Groups
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
