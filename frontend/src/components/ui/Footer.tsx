import Link from 'next/link';
import { Icon } from './Icon';
import { PAGE } from '@/lib/styles';
import { site } from '@/site.config';

const LINK =
    'font-header text-[15px] min-[980px]:text-lg min-[980px]:font-semibold text-foreground no-underline hover:underline';

/** Site footer: the site's links, the newsletter and social links. */
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
                        <p className="mt-5 text-lg">
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
                                    className="grid place-items-center w-[45px] h-[45px] rounded-full bg-accent-bright text-white"
                                >
                                    <Icon name={icon} className="w-6 h-6" />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </footer>
    );
}
