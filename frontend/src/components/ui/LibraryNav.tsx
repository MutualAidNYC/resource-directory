'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND_LABEL, PAGE } from '@/lib/styles';

const SECTIONS = [
    { href: '/services', label: 'Resources' },
    { href: '/organizations', label: 'Groups' },
] as const;

const LINK = 'border-b-4 py-2 md:pt-3.5 md:pb-2.5 text-secondary no-underline';

/**
 * The library's own links, under the site header on every page. The current section is
 * underlined: the list itself is the current page, a service or organization page is inside it.
 */
export function LibraryNav() {
    const pathname = usePathname().replace(/\/$/, '');

    return (
        <nav
            aria-label="Community Resources Library"
            className="border-b border-card-border bg-highlight-alt-border"
        >
            <div
                className={`${PAGE} flex flex-wrap items-center gap-x-[18px] md:gap-x-7 min-h-12 md:min-h-[52px]`}
            >
                <span
                    className={`${BRAND_LABEL} text-[15px] basis-full pt-2.5 md:basis-auto md:pt-0 md:mr-auto`}
                >
                    Community Resources Library
                </span>
                {SECTIONS.map(({ href, label }) => {
                    const current =
                        pathname === href
                            ? 'page'
                            : pathname.startsWith(`${href}/`)
                              ? 'true'
                              : undefined;
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={current}
                            className={`${LINK} ${current ? 'border-secondary font-bold' : 'border-transparent font-semibold hover:border-secondary-border'}`}
                        >
                            {label}
                        </Link>
                    );
                })}
                <a
                    href="https://mutualaid.nyc/submit-a-resource/"
                    className={`${LINK} border-transparent font-semibold hover:border-secondary-border`}
                >
                    Submit a resource
                </a>
            </div>
        </nav>
    );
}
