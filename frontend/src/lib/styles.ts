/** Class strings shared across pages, so one change restyles them all. */

/** The page's width (the theme's 70rem) and side gutter. */
export const PAGE = 'mx-auto w-full max-w-(--default-content-width) px-4';

/** A white card with a thin border, square. Add padding and anything else per use. */
export const CARD = 'border border-card-border bg-card-bg';

/** A featured block's frame (category tiles, maps): 4px teal tint, decorative. */
export const FRAME = 'border-4 border-secondary-border';

/**
 * A card or popup title link: purple, always underlined, so it reads as a link and not
 * as the theme's purple heading. The line turns solid purple on hover.
 */
export const TITLE_LINK =
    'text-tertiary underline decoration-tertiary-border decoration-2 underline-offset-4 hover:decoration-tertiary';

/** A Francois One label ("Resource", "Type of help"). Add the size per use. */
export const BRAND_LABEL = 'font-label uppercase tracking-[0.04em] text-secondary';

/** The short red bar above a list page's h1 (brand guide). */
export const BAR = 'h-1.5 w-16 bg-accent-bright';

/** A red underlined text button ("Clear all", "+3 more"). Add the size per use. */
export const TEXT_BUTTON = 'min-h-6 px-1 text-accent underline hover:no-underline';
