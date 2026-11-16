'use client';

import { useState, useRef, useEffect } from 'react';

export interface NavSubmenuItem {
    label: string;
    href: string;
}

interface NavSubmenuProps {
    /** The button label shown in the nav bar. */
    label: string;
    /** Links shown in the dropdown. */
    items: NavSubmenuItem[];
}

/**
 * Accessible nav submenu using the disclosure pattern.
 * Opens on hover or button activation; closes on Escape or focus leaving the container.
 */
export function NavSubmenu({ label, items }: NavSubmenuProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // Close when focus moves outside the container
    useEffect(() => {
        function onFocusOut(e: FocusEvent) {
            if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
                setOpen(false);
            }
        }
        const el = containerRef.current;
        el?.addEventListener('focusout', onFocusOut);
        return () => el?.removeEventListener('focusout', onFocusOut);
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            {/* Toggle button */}
            <button
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="nav-link inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
                {label}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                >
                    <path d="M1.50002 4L6.00002 8L10.5 4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </button>

            {/* Submenu */}
            {open && (
                <ul className="absolute right-0 top-full mt-2 bg-black text-white rounded-lg py-2 min-w-max z-50 before:absolute before:inset-x-0 before:-top-2 before:h-2">
                    {items.map((item) => (
                        <li key={item.href}>
                            <a href={item.href} className="nav-link block px-5 py-2">
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
