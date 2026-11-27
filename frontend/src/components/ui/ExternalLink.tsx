import { websiteLabel } from '@/lib/format';

interface ExternalLinkProps {
    href: string;
    className?: string;
    /** Read by screen readers after the link text, e.g. "for Bushwick Fridge". */
    context?: string;
    children: React.ReactNode;
}

/** A link that opens in a new tab and says so: a ↗ icon, and the words for screen readers. */
export function ExternalLink({ href, className, context, children }: ExternalLinkProps) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {children}
            <span className="sr-only">{context ? ` ${context}` : ''}, opens in a new tab</span>
            {/* inline-block, so the link's underline skips it; a margin, not a space, for the same reason. */}
            <span aria-hidden="true" className="inline-block ml-1 text-[0.85em]">
                ↗
            </span>
        </a>
    );
}

interface WebsiteLinkProps {
    /** A safe link from `externalHref`. */
    href: string;
    /** The resource or group the website belongs to. */
    name: string;
    className?: string;
    /** Leave out the domain or handle (cards). */
    linkOnly?: boolean;
}

/**
 * A website link that says what it does: "Visit website ↗ · example.org", or
 * "Instagram ↗ · @handle". The domain or handle is plain text, not part of the link.
 */
export function WebsiteLink({ href, name, className, linkOnly = false }: WebsiteLinkProps) {
    const { text, detail } = websiteLabel(href);
    return (
        <>
            <ExternalLink href={href} context={`for ${name}`} className={className}>
                {text}
            </ExternalLink>
            {!linkOnly && detail && <span className="text-muted"> · {detail}</span>}
        </>
    );
}
