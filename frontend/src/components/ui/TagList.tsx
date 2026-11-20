'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { TagLink } from '@/components/ui/TagLink';
import { TEXT_BUTTON } from '@/lib/styles';

export interface Tag {
    kind: 'need' | 'community';
    name: string;
}

const SHOWN = 3;
const noSubscribe = () => () => {};

/**
 * Category tags, 3 shown; past that a "+N more" button opens the rest in place and
 * becomes "Show fewer". Before JavaScript runs (or without it) "+N more" is plain text,
 * not a button that does nothing.
 */
export function TagList({ tags, name }: { tags: Tag[]; /** The resource, for the button's name. */ name: string }) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const hydrated = useSyncExternalStore(
        noSubscribe,
        () => true,
        () => false,
    );
    const extra = tags.length - SHOWN;

    return (
        <div id={id} className="flex flex-wrap items-center gap-1.5">
            {(open ? tags : tags.slice(0, SHOWN)).map(({ kind, name: tag }) => (
                <TagLink
                    key={`${kind}-${tag}`}
                    kind={kind}
                    href={`/services?${kind === 'need' ? 'category' : 'community'}=${encodeURIComponent(tag)}`}
                >
                    {tag}
                </TagLink>
            ))}
            {extra > 0 &&
                (hydrated ? (
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-controls={id}
                        className={`${TEXT_BUTTON} text-sm`}
                    >
                        {open ? 'Show fewer' : `+${extra} more`}
                        <span className="sr-only"> tags for {name}</span>
                    </button>
                ) : (
                    <span className="px-1 text-sm text-muted">+{extra} more</span>
                ))}
        </div>
    );
}
