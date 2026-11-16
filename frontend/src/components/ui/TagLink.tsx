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
            ? 'bg-[var(--tag-coral-bg)] text-[var(--tag-coral-text)] border border-[var(--tag-coral-text)]'
            : 'bg-[var(--tag-olive-bg)] text-[var(--tag-olive-text)] border border-[var(--tag-olive-text)]';

    return (
        <Link
            href={href}
            className={`inline-flex items-center rounded-full font-medium transition-opacity hover:opacity-80 ${sizeClasses} ${colorClasses}`}
        >
            {children}
        </Link>
    );
}
