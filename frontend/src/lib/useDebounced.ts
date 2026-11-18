import { useEffect, useState } from 'react';

/**
 * `value`, once it has stopped changing for `delay` ms. For live-region text, so a
 * screen reader announces the count once typing stops, not after every key.
 */
export function useDebounced<T>(value: T, delay = 500): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
