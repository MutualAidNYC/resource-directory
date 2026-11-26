import Link from 'next/link';
import { Icon } from './Icon';
import { PAGE } from '@/lib/styles';
import { site } from '@/site.config';

const LINK = 'font-header font-semibold text-sm text-foreground no-underline hover:underline';

/** Site footer: the library's lists, the site's links, the newsletter and social links. */
export function Footer() {
    return (
        <footer className="bg-card-bg">
            <div className={`${PAGE} grid gap-6 pt-12 pb-8 md:grid-cols-[1fr_auto]`}>
                <div>
                    <nav aria-label="Footer">
                        <ul className="flex flex-wrap gap-x-[22px] gap-y-2 list-none m-0 p-0">
                            <li>
                                <Link href="/" className={LINK}>
                                    {site.name}
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
                            {site.footerLinks.map(({ label, href }) => (
                                <li key={href}>
                                    <a href={href} className={LINK}>
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    {site.newsletterUrl && (
                        <p className="mt-5 text-[15px]">
                            <a href={site.newsletterUrl} className="underline hover:no-underline">
                                Subscribe to our newsletter
                            </a>
                        </p>
                    )}
                </div>
                {site.social.length > 0 && (
                    <ul className="flex gap-2.5 list-none m-0 p-0">
                        {site.social.map(({ icon, label, href }) => (
                            <li key={href}>
                                <a
                                    href={href}
                                    aria-label={`${site.owner.name} on ${label}`}
                                    className="grid place-items-center w-10 h-10 rounded-full bg-accent-bright text-white"
                                >
                                    <Icon name={icon} className="w-5 h-5" />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </footer>
    );
}
