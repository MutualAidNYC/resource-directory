'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
    placeholder?: string;
}

/** The home page search: opens /services with the query as `?q=`. */
export function SearchBar({ placeholder = 'Search resources...' }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/services?${new URLSearchParams({ q })}` : '/services');
    };

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
                    className={`w-full rounded-full border border-[var(--muted)] bg-[var(--card-bg)] shadow-sm 
            focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            text-[var(--foreground)]
            h-14 text-lg pl-6 pr-28`}
                />
                <div className="absolute right-2 flex items-center gap-1">
                    <button
                        type="submit"
                        className={`rounded-full bg-[var(--primary)] text-white 
            hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
            transition-colors px-5 py-2`}
                    >
                        Search
                    </button>
                </div>
            </div>
        </form>
    );
}
