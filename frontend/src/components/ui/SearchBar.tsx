'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
    initialQuery?: string;
    size?: 'sm' | 'lg';
    placeholder?: string;
}

/**
 * Reusable search bar. The location pin opens /services with `near=1`, which
 * asks for the visitor's location there. Coordinates never go in the URL.
 */
export function SearchBar({
    initialQuery = '',
    size = 'lg',
    placeholder = 'Search for services...'
}: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();

    /** Build the /services URL with the current query and optional `near`. */
    const buildUrl = (q: string, near = false) => {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (near) params.set('near', '1');
        const qs = params.toString();
        return qs ? `/services?${qs}` : '/services';
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        router.push(buildUrl(query));
    };

    const handleLocationSearch = () => router.push(buildUrl(query, true));

    const inputClasses = size === 'lg'
        ? 'h-14 text-lg pl-6 pr-28'
        : 'h-10 text-sm pl-4 pr-24';

    const btnPadding = size === 'lg' ? 'px-5 py-2' : 'px-3 py-1.5 text-sm';

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="relative flex items-center">
                <label htmlFor="search-input" className="sr-only">
                    {placeholder}
                </label>
                <input
                    id="search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm 
            focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            text-[var(--foreground)] placeholder:text-[var(--muted)]
            ${inputClasses}`}
                />
                <div className="absolute right-2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleLocationSearch}
                        aria-label="Search near my location"
                        title="Search near my location"
                        className="rounded-full p-2 text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--tag-coral-bg)] transition-colors"
                    >
                        <svg className="w-5 h-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    <button
                        type="submit"
                        className={`rounded-full bg-[var(--primary)] text-white 
            hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
            transition-colors ${btnPadding}`}
                    >
                        Search
                    </button>
                </div>
            </div>
        </form>
    );
}
