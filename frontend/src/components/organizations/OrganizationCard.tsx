import type { OrganizationListItem } from '@/lib/types';
import { DetailsLink } from '@/components/ui/DetailsLink';
import { CARD } from '@/lib/styles';

interface OrganizationCardProps {
    organization: OrganizationListItem;
}

/** An organization in the list. */
export function OrganizationCard({ organization }: OrganizationCardProps) {
    const count = organization.service_count;
    return (
        <article className={`${CARD} flex flex-col h-full p-5`}>
            <h3>{organization.name}</h3>
            {organization.description && (
                <p className="mt-2 line-clamp-3">{organization.description}</p>
            )}
            <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3">
                {count > 0 && (
                    <p className="text-muted">
                        {count} {count === 1 ? 'resource' : 'resources'}
                    </p>
                )}
                <DetailsLink href={`/organizations/${organization.id}`} name={organization.name} />
            </div>
        </article>
    );
}
