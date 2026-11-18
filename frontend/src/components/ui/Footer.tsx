import Link from 'next/link';
import { ExternalLink } from './ExternalLink';

/**
 * Site footer with warm navy background and cream text.
 */
export function Footer() {
    return (
        <footer className="border-t border-card-border bg-secondary">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Branding */}
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                            Mutual Aid <span className="text-highlight">NYC</span>
                        </span>
                    </div>

                    {/* Links */}
                    <nav className="flex flex-wrap gap-6 text-sm">
                        <Link href="/services" className="text-white underline hover:no-underline">
                            Resources
                        </Link>
                        <Link
                            href="/organizations"
                            className="text-white underline hover:no-underline"
                        >
                            Groups
                        </Link>
                    </nav>

                    {/* Attribution */}
                    <p className="text-sm text-white">
                        Powered by{' '}
                        <ExternalLink
                            href="https://openreferral.org"
                            className="hover:no-underline underline text-inherit"
                        >
                            Open Referral HSDS
                        </ExternalLink>
                    </p>
                </div>
            </div>
        </footer>
    );
}
