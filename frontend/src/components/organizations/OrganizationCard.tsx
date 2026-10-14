import Link from 'next/link';
import type { OrganizationListItem } from '@/lib/types';

interface OrganizationCardProps {
    organization: OrganizationListItem;
}

/**
 * Card component for displaying group summary in lists.
 */
export function OrganizationCard({ organization }: OrganizationCardProps) {
    return (
        <Link
            href={`/organizations/${organization.id}`}
            className="group flex flex-col justify-between h-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm 
            transition-all hover:border-[var(--primary)]/40 hover:shadow-md"
        >
            <div className="min-w-0">
                {/* Group Name */}
                <h3 className="font-semibold text-lg text-[var(--foreground)] group-hover:text-[var(--primary)]">
                    {organization.name}
                </h3>
                {/* Description */}
                {organization.description && (
                    <p className="mt-2 text-[var(--foreground)] line-clamp-3">
                        {organization.description}
                    </p>
                )}
            </div>

            {/* Resource Count */}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {organization.service_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--tag-olive-bg)] text-[var(--tag-olive-text)] border border-[var(--tag-olive-text)]">
                        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {organization.service_count} {organization.service_count === 1 ? 'Resource' : 'Resources'}
                    </span>
                )}
            </div>
        </Link>
    );
}