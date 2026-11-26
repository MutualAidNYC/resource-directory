'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NavSubmenu } from './NavSubmenu';
import { site } from '@/site.config';

/**
 * Site header: the owner's logo and the links in `site.config.ts`.
 */
export function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="w-full bg-secondary">
            {/* Wide margins only from md up: on phones they pushed the logo and menu button to the middle. */}
            <div className="w-full px-4 md:px-[50px]">
                {/* ── Header row */}
                <div className="flex h-[80px] xl:h-[160px] items-center justify-between md:mx-[42.36px]">
                    {/* Logo */}
                    <a href={site.owner.url} className="flex items-center gap-3">
                        <Image
                            src={site.logo}
                            alt={`${site.owner.name} logo`}
                            width={130}
                            height={130}
                            className="w-[60px] h-[60px] xl:w-[120px] xl:h-[120px]"
                        />
                    </a>

                    {/* Hamburger — mobile only */}
                    <button
                        aria-expanded={mobileOpen}
                        aria-controls={mobileOpen ? 'mobile-nav' : undefined}
                        aria-label={mobileOpen ? 'Close menu' : 'Menu'}
                        onClick={() => setMobileOpen((v) => !v)}
                        className="xl:hidden text-white p-2 -mr-2"
                    >
                        {mobileOpen ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                        )}
                    </button>

                    {/* Desktop nav — always visible at xl+. No wrapping: below xl the links
                        would split onto two lines, so the menu button takes over there. */}
                    <nav className="hidden xl:flex" aria-label="Main navigation">
                        <ul className="flex items-center gap-[19.2px] list-none m-0 p-0 whitespace-nowrap">
                            <li>
                                <Link href="/" className="nav-link">
                                    {site.name}
                                </Link>
                            </li>
                            {site.nav.map((entry) => (
                                <li key={entry.label}>
                                    {'items' in entry ? (
                                        <NavSubmenu label={entry.label} items={entry.items} />
                                    ) : (
                                        <a href={entry.href} className="nav-link">
                                            {entry.label}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* ── Mobile nav panel */}
                {mobileOpen && (
                    <nav
                        id="mobile-nav"
                        aria-label="Mobile navigation"
                        className="xl:hidden py-4 border-t border-white/20"
                    >
                        <ul className="flex flex-col gap-1 list-none m-0 p-0">
                            <li>
                                <Link
                                    href="/"
                                    className="nav-link block py-2"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {site.name}
                                </Link>
                            </li>
                            {site.nav.map((entry) =>
                                'items' in entry ? (
                                    // Submenus shown flat on mobile, under their label: no hover submenu.
                                    <Fragment key={entry.label}>
                                        <li className="text-white/60 text-sm font-semibold tracking-tight pt-3 pb-1">
                                            {entry.label}
                                        </li>
                                        {entry.items.map((item) => (
                                            <li key={item.href}>
                                                <a
                                                    href={item.href}
                                                    className="nav-link block py-2 pl-3"
                                                >
                                                    {item.label}
                                                </a>
                                            </li>
                                        ))}
                                    </Fragment>
                                ) : (
                                    <li key={entry.label}>
                                        <a href={entry.href} className="nav-link block py-2">
                                            {entry.label}
                                        </a>
                                    </li>
                                ),
                            )}
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
}
