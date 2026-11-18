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
        .map((part) => part?.replace(/\s+/g, ' ').trim())
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
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
            ? parsed.href
            : undefined;
    } catch {
        return undefined;
    }
}

// Social sites, by host without "www." or "m.". A link to one names the platform.
const SOCIAL: Record<string, string> = {
    'instagram.com': 'Instagram',
    'facebook.com': 'Facebook',
    'x.com': 'X',
    'twitter.com': 'X',
    'tiktok.com': 'TikTok',
};

// First path segments that aren't an account name ("facebook.com/groups/…").
const NOT_A_HANDLE = new Set(['groups', 'pages', 'profile.php', 'share', 'p', 'reel']);

/**
 * How to show a website link (an `externalHref` result): the link text, and plain
 * text to put after it. "Visit website" + the domain without "www."; for a social
 * site, the platform + "@handle".
 */
export function websiteLabel(href: string): { text: string; detail: string } {
    const url = new URL(href);
    const host = url.hostname.replace(/^(www\d*|m)\./, '');
    const platform = SOCIAL[host];
    if (!platform) return { text: 'Visit website', detail: host };
    const segment = url.pathname.split('/')[1] ?? '';
    const handle = segment && !NOT_A_HANDLE.has(segment) ? `@${segment.replace(/^@/, '')}` : '';
    return { text: platform, detail: handle };
}
