import type { BrandIcon } from '@/components/ui/Icon';

/**
 * This deployment's names, copy, links and map start. The rest of what a deployment
 * changes: "Your own site" in the frontend README.
 */

export interface SiteLink {
    label: string;
    href: string;
}

/** A header nav entry: a link, or a submenu of links. */
export type NavEntry = SiteLink | { label: string; items: SiteLink[] };

export interface SiteConfig {
    /** The directory's name: home page heading, nav links and page titles. */
    name: string;
    /** The group running the directory. `name` starts the home page title and is the logo's alt
     * text; the logo (`public/logo.png`) links to `url`. */
    owner: { name: string; url: string };
    /** Under the home page heading. */
    tagline: string;
    /** Search-result descriptions: the home page's, and the services list's. */
    description: string;
    servicesDescription: string;
    /** Where people submit a new service or a change. Leave out to hide its links. */
    submitUrl?: string;
    suggestUrl?: string;
    /** Header links after the directory's own home link. */
    nav: NavEntry[];
    /** Footer links after the directory's own lists. */
    footerLinks: SiteLink[];
    newsletterUrl?: string;
    social: { icon: BrandIcon; label: string; href: string }[];
    /** Where the map starts before pins load: [longitude, latitude] and zoom. */
    map: { center: [number, number]; zoom: number };
}

const ABOUT = 'https://mutualaid.nyc/about/';

/** In both the header and the footer. */
const SITE_LINKS: SiteLink[] = [
    { label: 'Mutual aid groups', href: 'https://mutualaid.nyc/mutual-aid-groups/' },
    { label: 'For groups + organizers', href: 'https://mutualaid.nyc/for-groups-organizers/' },
    { label: 'Volunteer', href: 'https://mutualaid.nyc/get-involved/' },
];

export const site: SiteConfig = {
    name: 'Community Resources Library',
    owner: { name: 'Mutual Aid NYC', url: 'https://mutualaid.nyc' },
    tagline: 'Resources for New Yorkers, shared by the community and organized by volunteers.',
    description:
        'Find food, housing, legal help, social services, and other community resources for New Yorkers. Free and low-cost, community-sourced and volunteer-curated.',
    servicesDescription: 'Search community resources in New York, as a list or on a map.',
    submitUrl: 'https://mutualaid.nyc/submit-a-resource/',
    suggestUrl: 'https://mutualaid.nyc/suggest-a-change/',
    nav: [
        ...SITE_LINKS,
        {
            label: 'About',
            items: [
                { label: 'About Mutual Aid NYC', href: ABOUT },
                { label: 'Guiding principles', href: 'https://mutualaid.nyc/about/principles/' },
            ],
        },
    ],
    footerLinks: [...SITE_LINKS, { label: 'About', href: ABOUT }],
    newsletterUrl: 'https://mutualaidnyc.substack.com',
    social: [
        { icon: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/mutualaidnyc/' },
        { icon: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/MutualAidNY' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/MutualAidNYC' },
    ],
    map: { center: [-74.006, 40.7128], zoom: 10 },
};
