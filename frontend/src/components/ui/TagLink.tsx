import Link from 'next/link';

interface TagLinkProps {
    href: string;
    children: React.ReactNode;
    /** Need tags are purple, community tags teal. */
    kind: 'need' | 'community';
    size?: 'sm' | 'md';
}

/**
 * A pill-shaped category link. The 1px border in the text color is what makes it read as
 * a link: the tint fills are barely different from white or cream.
 */
export function TagLink({ href, children, kind, size = 'md' }: TagLinkProps) {
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
    const colorClasses =
        kind === 'need'
            ? 'bg-tag-purple-bg text-tertiary border-tertiary'
            : 'bg-tag-olive-bg text-tag-olive-text border-tag-olive-text';

    return (
        <Link
            href={href}
            className={`inline-flex items-center rounded-full border text-sm font-medium no-underline hover:underline ${sizeClasses} ${colorClasses}`}
        >
            {children}
        </Link>
    );
}
