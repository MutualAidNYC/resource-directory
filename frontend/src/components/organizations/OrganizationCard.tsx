import Link from 'next/link';
import type { OrganizationListItem } from '@/lib/types';
import { CARD, TITLE_LINK } from '@/lib/styles';

interface OrganizationCardProps {
    organization: OrganizationListItem;
}

/**
 * An organization in the list. The title is the link; the service count sits at the
 * bottom, so it lines up across a row.
 */
export function OrganizationCard({ organization }: OrganizationCardProps) {
    const count = organization.service_count;
    return (
        <article className={`${CARD} flex flex-col h-full p-5`}>
            <h3>
                <Link href={`/organizations/${organization.id}`} className={TITLE_LINK}>
                    {organization.name}
                </Link>
            </h3>
            {organization.description && (
                <p className="mt-2 line-clamp-3">{organization.description}</p>
            )}
            {count > 0 && (
                <p className="mt-auto pt-4 text-muted">
                    {count} {count === 1 ? 'resource' : 'resources'}
                </p>
            )}
        </article>
    );
}
