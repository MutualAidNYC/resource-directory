'use client';

import type { Ref } from 'react';
import { useDebounced } from '@/lib/useDebounced';

interface CountLineProps {
    /** Shown as typed, so it never lags the cards: "72 resources for “food”". */
    text: string;
    /** Read at once after a click, once typing stops while typing; defaults to `text`. */
    status?: string;
    /** Focusable (tabIndex -1), for moving focus here when a removed chip takes it away. */
    ref?: Ref<HTMLParagraphElement>;
}

/** A list's result count ("337 resources found"), with a polite live region for screen readers. */
export function CountLine({ text, status = text, ref }: CountLineProps) {
    const announced = useDebounced(status);
    return (
        <p ref={ref} tabIndex={-1} className="font-header font-bold text-lg text-secondary">
            <span aria-hidden="true">{text}</span>
            <span role="status" className="sr-only">
                {announced}
            </span>
        </p>
    );
}
