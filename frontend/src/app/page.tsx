import fs from 'node:fs';
import path from 'node:path';
import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SearchBar } from '@/components/ui/SearchBar';
import { counts, getMapData } from '@/lib/data';
import { BAR, FRAME, PAGE } from '@/lib/styles';
import { site } from '@/site.config';

/** Category icons live in the repo, not Airtable: see "Your own site" in the frontend README. */
const ICON_DIR = 'icons/need_categories';

/** Category name to icon filename: lowercase, non-alphanumeric runs to "-". */
function iconSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** A category name that may break after each "/" ("Delivery/Transport"), not mid-word. */
function breakAfterSlashes(name: string) {
    return name.split('/').map((part, i) => (
        <Fragment key={i}>
            {i > 0 && (
                <>
                    /<wbr />
                </>
            )}
            {part}
        </Fragment>
    ));
}

/**
 * Homepage based on mutualaid.nyc.
 */
export default function Home() {
    const published = counts();
    const stats = { resources: published.services, groups: published.organizations };
    // Category names come from matched taxonomy terms, so "-Not Listed" is never one.
    const categories = getMapData().needCategories;

    // Which icons exist on disk, so a category without one falls back to the
    // placeholder dot instead of rendering a broken image.
    const iconFiles = new Set(
        fs
            .readdirSync(path.join(process.cwd(), 'public', ICON_DIR))
            .filter((f) => f.endsWith('.png')),
    );

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="py-10 md:pt-24 md:pb-16 bg-background">
                <div className={`${PAGE} text-center`}>
                    <div className={`${BAR} mx-auto mb-5`} />
                    <h1>{site.name}</h1>
                    <p className="mx-auto mt-5 max-w-[46rem] font-header text-lg md:text-[22px] font-bold tracking-[-0.04em] text-accent text-balance">
                        {site.tagline}
                    </p>
                    <p className="mt-7 mb-3 text-lg">
                        Search {stats.resources.toLocaleString()} resources from{' '}
                        {stats.groups.toLocaleString()} groups
                    </p>
                    <div className="flex justify-center">
                        <SearchBar placeholder="Search resources" />
                    </div>
                    {(site.submitUrl || site.suggestUrl) && (
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            {site.submitUrl && (
                                <a
                                    href={site.submitUrl}
                                    className="btn btn-secondary flex-1 sm:flex-none"
                                >
                                    Submit a resource
                                </a>
                            )}
                            {site.suggestUrl && (
                                <a
                                    href={site.suggestUrl}
                                    className="btn btn-secondary flex-1 sm:flex-none"
                                >
                                    Suggest a change
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Resource Categories  */}
            {categories.length > 0 && (
                <section className="pt-12 pb-16 bg-section-alt">
                    <div className={PAGE}>
                        {/* On phones the link goes under the heading, so its arrow can't wrap alone. */}
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-baseline sm:justify-between mb-6">
                            <h2>Browse by category</h2>
                            <Link
                                href="/services"
                                className="text-accent hover:text-accent-hover font-medium transition-colors underline hover:no-underline"
                            >
                                View all resources →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-4">
                            {categories.map((category) => {
                                return (
                                    <Link
                                        key={category.name}
                                        href={`/services?category=${encodeURIComponent(category.name)}`}
                                        className={`flex items-center gap-2.5 md:gap-3.5 p-3 md:p-4 bg-card-bg ${FRAME} text-foreground no-underline hover:bg-highlight-alt-border`}
                                    >
                                        <span className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                                            {iconFiles.has(`${iconSlug(category.name)}.png`) ? (
                                                <Image
                                                    src={`/${ICON_DIR}/${iconSlug(category.name)}.png`}
                                                    alt=""
                                                    width={60}
                                                    height={60}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <span className="w-full h-full rounded-full bg-section-alt block" />
                                            )}
                                        </span>
                                        <span className="min-w-0 [overflow-wrap:break-word] text-[15px] md:text-base font-semibold">
                                            {breakAfterSlashes(category.name)}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
