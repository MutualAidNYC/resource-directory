import { ExternalLink, WebsiteLink } from '@/components/ui/ExternalLink';
import { formatAddress } from '@/lib/format';
import { BRAND_LABEL } from '@/lib/styles';
import type { Location } from '@/lib/types';

interface ContactListProps {
    /** The resource or group, for the website link's name. */
    name: string;
    /** A safe link from `externalHref`. */
    website?: string;
    phones: string[];
    email?: string;
    /** Each location's addresses are listed, in this order. */
    locations: Location[];
}

/**
 * A detail page's contact information: Website, Phone, Email, Address, in one row of
 * entries between two lines. Information, not buttons; nothing when there's none.
 */
export function ContactList({ name, website, phones, email, locations }: ContactListProps) {
    const addresses = locations.flatMap((loc) =>
        (loc.addresses ?? [])
            .map((address) => ({ id: address.id, name: loc.name, text: formatAddress(address) }))
            .filter((address) => address.text),
    );
    if (!website && phones.length === 0 && !email && addresses.length === 0) return null;

    return (
        <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-4 border-y border-card-border py-4">
            {website && (
                <Entry label="Website">
                    <WebsiteLink href={website} name={name} className="underline hover:no-underline" />
                </Entry>
            )}
            {phones.length > 0 && (
                <Entry label="Phone">
                    {phones.map((phone) => (
                        <a key={phone} href={`tel:${phone}`} className="block underline hover:no-underline">
                            {phone}
                        </a>
                    ))}
                </Entry>
            )}
            {email && (
                <Entry label="Email">
                    <a href={`mailto:${email}`} className="underline hover:no-underline break-all">
                        {email}
                    </a>
                </Entry>
            )}
            {addresses.length > 0 && (
                <Entry label="Address">
                    {addresses.map((address) => (
                        <div key={address.id} className="mt-3 first:mt-0">
                            {/* Many locations are named after their street: don't say it twice. */}
                            {address.name && !address.text.startsWith(address.name) && (
                                <p>{address.name}</p>
                            )}
                            <address className="not-italic">{address.text}</address>
                            <ExternalLink
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.text)}`}
                                context={`to ${address.name || address.text}`}
                                className="underline hover:no-underline"
                            >
                                Get directions
                            </ExternalLink>
                        </div>
                    ))}
                </Entry>
            )}
        </dl>
    );
}

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className={`${BRAND_LABEL} text-sm`}>{label}</dt>
            <dd className="mt-1 text-lg">{children}</dd>
        </div>
    );
}
