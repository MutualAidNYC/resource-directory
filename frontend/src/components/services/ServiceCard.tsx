import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { TagList } from '@/components/ui/TagList';
import { WebsiteLink } from '@/components/ui/ExternalLink';
import { externalHref } from '@/lib/format';
import { CARD, TITLE_LINK } from '@/lib/styles';

interface ServiceCardProps {
    id: string;
    name: string;
    description?: string;
    url?: string;
    address?: string;
    /** The organization line; left out on organization pages, which already name it. */
    organizationName?: string;
    /** Phone numbers: organization pages only (the services list leaves them for the detail page). */
    phones?: string[];
    needFocus?: string[];
    communityFocus?: string[];
    /** Shows "View on map" (services list, services with a pin). */
    onViewOnMap?: () => void;
}

/**
 * A service in a list: the services list, or an organization's page (no organization
 * line, tags or map button; phone numbers instead). Title → organization → address →
 * website → phone → description → tags (3, then "+N more"), which sit at the bottom so
 * they line up across a row.
 */
export function ServiceCard({
    id,
    name,
    description,
    url,
    address,
    organizationName,
    phones = [],
    needFocus = [],
    communityFocus = [],
    onViewOnMap,
}: ServiceCardProps) {
    const website = externalHref(url);

    return (
        <article className={`${CARD} @container flex flex-col p-5`}>
            {/* The title wraps beside "View on map", which reads "Map" on narrow cards. */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0">
                    <Link href={`/services/${id}`} className={TITLE_LINK}>
                        {name}
                    </Link>
                </h3>
                {onViewOnMap && (
                    <button
                        type="button"
                        onClick={onViewOnMap}
                        className="flex-none -mt-0.5 inline-flex items-center gap-1.5 border border-muted bg-card-bg px-3 py-1 text-[15px] text-secondary hover:bg-highlight-alt-border"
                    >
                        <Icon name="pin" className="w-[18px] h-[18px]" />
                        <span className="@max-[420px]:hidden">View on map</span>
                        <span className="hidden @max-[420px]:inline">Map</span>
                        <span className="sr-only">: {name}</span>
                    </button>
                )}
            </div>

            {organizationName && <p className="mt-1 text-muted">{organizationName}</p>}

            {address && (
                <p className="mt-3 flex items-start gap-2 text-muted">
                    <Icon
                        name="pin"
                        label="address"
                        className="w-[18px] h-[18px] mt-0.5 shrink-0"
                    />
                    <span>{address}</span>
                </p>
            )}

            {(website || phones.length > 0) && (
                <div className="mt-3 flex flex-col gap-2">
                    {website && (
                        <p className="flex items-center gap-2 min-w-0">
                            <Icon name="link" className="w-[18px] h-[18px] shrink-0" />
                            <WebsiteLink
                                href={website}
                                name={name}
                                className="underline hover:no-underline text-accent"
                                oneLine
                            />
                        </p>
                    )}
                    {phones.map((phone) => (
                        <p key={phone} className="flex items-center gap-2">
                            <Icon
                                name="phone"
                                label="phone"
                                className="w-[18px] h-[18px] shrink-0"
                            />
                            <a href={`tel:${phone}`} className="underline hover:no-underline">
                                {phone}
                            </a>
                        </p>
                    ))}
                </div>
            )}

            {description && <p className="mt-3 line-clamp-2">{description}</p>}

            {needFocus.length + communityFocus.length > 0 && (
                <div className="mt-auto pt-4">
                    <TagList
                        name={name}
                        tags={[
                            ...needFocus.map((tag) => ({ kind: 'need' as const, name: tag })),
                            ...communityFocus.map((tag) => ({ kind: 'community' as const, name: tag })),
                        ]}
                    />
                </div>
            )}
        </article>
    );
}
