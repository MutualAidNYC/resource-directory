import Link from 'next/link';

/** A card's link to its detail page. The `sr-only` name tells the links in a list apart. */
export function DetailsLink({
    href,
    name,
}: {
    href: string;
    /** Read by screen readers after "See full details". */
    name: string;
}) {
    return (
        <Link href={href} className="btn btn-secondary self-start border-2 px-5 py-2">
            See full details<span className="sr-only"> for {name}</span>
        </Link>
    );
}
