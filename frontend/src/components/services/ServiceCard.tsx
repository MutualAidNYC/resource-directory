import Link from 'next/link';
import { formatAddress } from '@/lib/format';
import type { Service, ServiceSummary } from '@/lib/types';

interface ServiceCardProps {
    service: ServiceSummary & Pick<Service, 'service_at_locations'>;
}

/**
 * A resource in a group page's list: name, description and its first address.
 * No group line: the page it's on already names the group.
 */
export function ServiceCard({ service }: ServiceCardProps) {
    return (
        <Link
            href={`/services/${service.id}`}
            className="group block rounded-xl border border-card-border bg-card-bg p-6 shadow-sm 
        transition-all hover:border-accent/40 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Service Name */}
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-accent truncate">
                        {service.name}
                    </h3>

                    {/* Description */}
                    {service.description && (
                        <p className="mt-3 text-foreground line-clamp-2">{service.description}</p>
                    )}
                </div>
            </div>

            {/* Footer with address */}
            {(() => {
                const loc = service.service_at_locations?.find(
                    (s) => s.location?.addresses?.length,
                );
                const addr = loc?.location?.addresses?.[0];
                if (!addr) return null;
                const text = formatAddress(addr);
                if (!text) return null;
                return (
                    <div className="mt-4 pt-4 border-t border-card-border">
                        <p className="text-sm text-foreground flex items-center gap-1">
                            <svg
                                className="w-4 h-4 shrink-0"
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
                            <span className="truncate">{text}</span>
                        </p>
                    </div>
                );
            })()}
        </Link>
    );
}
