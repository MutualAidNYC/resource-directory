'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NavSubmenu } from './NavSubmenu';

const ABOUT_ITEMS = [
    { label: 'About Mutual Aid NYC', href: 'https://mutualaid.nyc/about/' },
    { label: 'Guiding Principles', href: 'https://mutualaid.nyc/about/principles/' },
];

/**
 * Site header that matches mutualaid.nyc.
 */
export function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="w-full bg-[var(--nav-bg)]">
            {/* Wide margins only from md up: on phones they pushed the logo and menu button to the middle. */}
            <div className="w-full px-4 md:px-[50px]">

                {/* ── Header row */}
                <div className="flex h-[80px] xl:h-[160px] items-center justify-between md:mx-[42.36px]">

                    {/* Logo */}
                    <a href="https://mutualaid.nyc" className="flex items-center gap-3">
                        <Image
                            src="/logo.png"
                            alt="Mutual Aid NYC logo"
                            width={130}
                            height={130}
                            className="w-[60px] h-[60px] xl:w-[120px] xl:h-[120px]"
                        />
                    </a>

                    {/* Hamburger — mobile only */}
                    <button
                        aria-expanded={mobileOpen}
                        aria-label="Toggle navigation"
                        onClick={() => setMobileOpen(v => !v)}
                        className="xl:hidden text-white p-2 -mr-2"
                    >
                        {mobileOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                        )}
                    </button>

                    {/* Desktop nav — always visible at xl+ */}
                    <nav className="hidden xl:flex" aria-label="Main navigation">
                        <ul className="flex items-center gap-[19.2px] list-none m-0 p-0">
                            <li><Link href="/" className="nav-link">Community Resources Library</Link></li>
                            <li><a href="https://mutualaid.nyc/mutual-aid-groups/" className="nav-link">Mutual aid groups</a></li>
                            <li><a href="https://mutualaid.nyc/for-groups-organizers/" className="nav-link">For groups + organizers</a></li>
                            <li><a href="https://mutualaid.nyc/get-involved/" className="nav-link">Volunteer</a></li>
                            <li><NavSubmenu label="About" items={ABOUT_ITEMS} /></li>
                        </ul>
                    </nav>
                </div>

                {/* ── Mobile nav panel */}
                {mobileOpen && (
                    <nav
                        aria-label="Mobile navigation"
                        className="xl:hidden py-4 border-t border-white/20"
                    >
                        <ul className="flex flex-col gap-1 list-none m-0 p-0">
                            <li>
                                <Link href="/" className="nav-link block py-2" onClick={() => setMobileOpen(false)}>
                                    Community Resources Library
                                </Link>
                            </li>
                            <li><a href="https://mutualaid.nyc/mutual-aid-groups/" className="nav-link block py-2">Mutual aid groups</a></li>
                            <li><a href="https://mutualaid.nyc/for-groups-organizers/" className="nav-link block py-2">For groups + organizers</a></li>
                            <li><a href="https://mutualaid.nyc/get-involved/" className="nav-link block py-2">Volunteer</a></li>
                            {/* About items shown flat on mobile — no hover submenu */}
                            <li className="text-white/60 text-sm font-semibold tracking-tight pt-3 pb-1">About</li>
                            {ABOUT_ITEMS.map(item => (
                                <li key={item.href}>
                                    <a href={item.href} className="nav-link block py-2 pl-3">{item.label}</a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
}
