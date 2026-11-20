import { useEffect, useRef, useState } from 'react';

/**
 * `value` for live-region text: at once after `delay` ms without a change (a removed
 * chip, a picked filter), otherwise once it stops changing for `delay` ms, so a screen
 * reader announces the count once typing stops, not after every key.
 */
export function useDebounced<T>(value: T, delay = 500): T {
    const [debounced, setDebounced] = useState(value);
    const changedAt = useRef(0);
    useEffect(() => {
        const quiet = Date.now() - changedAt.current >= delay;
        changedAt.current = Date.now();
        const timer = setTimeout(() => setDebounced(value), quiet ? 0 : delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
