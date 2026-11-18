import Link from 'next/link';

interface TagLinkProps {
    href: string;
    children: React.ReactNode;
    colorScheme?: 'coral' | 'olive';
    size?: 'sm' | 'md';
}

/**
 * Standardized pill-shaped tag link used for taxonomic categories
 * like Need Focus (coral) and Community Focus (olive).
 */
export function TagLink({ href, children, colorScheme = 'coral', size = 'md' }: TagLinkProps) {
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
    const colorClasses =
        colorScheme === 'coral'
            ? 'bg-tag-coral-bg text-tag-coral-text border border-tag-coral-text'
            : 'bg-tag-olive-bg text-tag-olive-text border border-tag-olive-text';

    return (
        <Link
            href={href}
            className={`inline-flex items-center rounded-full font-medium transition-opacity hover:opacity-80 ${sizeClasses} ${colorClasses}`}
        >
            {children}
        </Link>
    );
}
