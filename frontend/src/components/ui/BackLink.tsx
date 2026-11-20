'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useListUrl, type ListPath } from '@/lib/listUrl';

interface BackLinkProps {
    list: ListPath;
    children: React.ReactNode;
}

/** "Back to all resources": returns to the list with the search and filters it had. */
export function BackLink({ list, children }: BackLinkProps) {
    const href = useListUrl(list);
    return (
        <Link href={href} className="btn btn-secondary gap-2">
            <Icon name="chevron-left" className="w-4 h-4" />
            {children}
        </Link>
    );
}
