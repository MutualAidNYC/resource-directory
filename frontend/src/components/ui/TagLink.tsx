import Link from 'next/link';

interface TagLinkProps {
    href: string;
    children: React.ReactNode;
    /** Need tags are purple, community tags teal. */
    kind: 'need' | 'community';
}

/**
 * A pill-shaped category link. The 1px border in the text color is what makes it read as
 * a link: the tint fills are barely different from white or cream.
 */
export function TagLink({ href, children, kind }: TagLinkProps) {
    const colorClasses =
        kind === 'need'
            ? 'bg-tag-purple-bg text-tertiary border-tertiary'
            : 'bg-tag-olive-bg text-tag-olive-text border-tag-olive-text';

    return (
        <Link
            href={href}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium no-underline hover:underline ${colorClasses}`}
        >
            {children}
        </Link>
    );
}
