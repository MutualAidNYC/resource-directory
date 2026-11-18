import Link from 'next/link';
import { Icon } from './Icon';
import { PAGE } from '@/lib/styles';

const LINK = 'font-header font-semibold text-sm text-foreground no-underline hover:underline';

// The same places as the header and mutualaid.nyc's footer, plus the library's lists.
const SITE_LINKS = [
    { label: 'Mutual aid groups', href: 'https://mutualaid.nyc/mutual-aid-groups/' },
    { label: 'For groups + organizers', href: 'https://mutualaid.nyc/for-groups-organizers/' },
    { label: 'Volunteer', href: 'https://mutualaid.nyc/get-involved/' },
    { label: 'About', href: 'https://mutualaid.nyc/about/' },
];

const SOCIAL = [
    { name: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/mutualaidnyc/' },
    { name: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/MutualAidNY' },
    { name: 'github', label: 'GitHub', href: 'https://github.com/MutualAidNYC' },
] as const;

/** Site footer, as on mutualaid.nyc: white, its nav, the newsletter and social links. */
export function Footer() {
    return (
        <footer className="bg-card-bg">
            <div className={`${PAGE} grid gap-6 pt-12 pb-8 md:grid-cols-[1fr_auto]`}>
                <div>
                    <nav aria-label="Footer">
                        <ul className="flex flex-wrap gap-x-[22px] gap-y-2 list-none m-0 p-0">
                            <li>
                                <Link href="/" className={LINK}>
                                    Community Resources Library
                                </Link>
                            </li>
                            <li>
                                <Link href="/services" className={LINK}>
                                    Resources
                                </Link>
                            </li>
                            <li>
                                <Link href="/organizations" className={LINK}>
                                    Groups
                                </Link>
                            </li>
                            {SITE_LINKS.map(({ label, href }) => (
                                <li key={href}>
                                    <a href={href} className={LINK}>
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <p className="mt-5 text-[15px]">
                        <a
                            href="https://mutualaidnyc.substack.com"
                            className="underline hover:no-underline"
                        >
                            Subscribe to our newsletter
                        </a>
                    </p>
                </div>
                <ul className="flex gap-2.5 list-none m-0 p-0">
                    {SOCIAL.map(({ name, label, href }) => (
                        <li key={name}>
                            <a
                                href={href}
                                aria-label={`Mutual Aid NYC on ${label}`}
                                className="grid place-items-center w-10 h-10 rounded-full bg-accent-bright text-white"
                            >
                                <Icon name={name} className="w-5 h-5" />
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </footer>
    );
}
