import Link from 'next/link';
import { formatAddress } from '@/lib/format';
import type { Service, ServiceSummary } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { CARD } from '@/lib/styles';

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
            className={`group block ${CARD} p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-md`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Service Name */}
                    <h3 className="text-lg text-foreground group-hover:text-accent truncate">
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
                            <Icon name="pin" label="address" className="w-4 h-4 shrink-0" />
                            <span className="truncate">{text}</span>
                        </p>
                    </div>
                );
            })()}
        </Link>
    );
}
