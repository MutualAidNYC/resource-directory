import type { Address } from './types';

/** An address as one line: street, unit, city, state, ZIP. Empty parts are left out. */
export function formatAddress(address: Address): string {
    return [
        address.address_1,
        address.address_2,
        address.city,
        address.state_province,
        address.postal_code,
    ]
        .filter(Boolean)
        .join(', ');
}

// Letters, digits, + and - before a colon. Dots aren't allowed, so "example.org:8080"
// is read as a host with a port, not a scheme.
const SCHEME = /^[a-z][a-z0-9+-]*:/i;

/**
 * A safe link for a website from Airtable, or undefined if there is none.
 * Adds https:// when the scheme is missing ("example.org"), and allows only
 * http and https, so a value like "javascript:…" never becomes a link.
 */
export function externalHref(url: string | undefined | null): string | undefined {
    const value = url?.trim();
    if (!value) return undefined;
    const withScheme = SCHEME.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
    try {
        const parsed = new URL(withScheme);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined;
    } catch {
        return undefined;
    }
}
