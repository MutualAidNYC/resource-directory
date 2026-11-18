/** Outline icons (24×24, 2px stroke): each is its path `d` values. */
const PATHS = {
    pin: [
        'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
        'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    ],
    phone: [
        'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    ],
    link: [
        'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    ],
    email: [
        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    ],
    'chevron-left': ['M15 19l-7-7 7-7'],
};

interface IconProps {
    name: keyof typeof PATHS;
    /** Size and spacing, e.g. "w-4 h-4 shrink-0". */
    className: string;
}

/** An outline icon, hidden from screen readers: the text beside it says what it is. */
export function Icon({ name, className }: IconProps) {
    return (
        <svg
            className={className}
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            {PATHS[name].map((d) => (
                <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
            ))}
        </svg>
    );
}
