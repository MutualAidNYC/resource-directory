import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { counts, getMapData } from "@/lib/data";

/** Category icons live in the repo, not Airtable — see that folder's README. */
const ICON_DIR = "icons/need_categories";

/** Category name to icon filename: lowercase, non-alphanumeric runs to "-". */
function iconSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    fs.readdirSync(path.join(process.cwd(), "public", ICON_DIR))
      .filter((f) => f.endsWith(".png"))
  );

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="pt-10 pb-12 md:py-28 px-4 bg-[var(--background)]">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-black text-4xl md:text-6xl text-[var(--secondary)] mb-6">
              Community Resources Library
            </h1>
          </div>
          <div className="max-w-3xl mb-10 mx-auto">
            <p className="text-2xl font-bold text-[var(--primary)] mb-4">
              Our community-sourced, volunteer-curated library is a collection of the many resources available to New Yorkers.
            </p>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xl mb-5">
              Search the directory of {stats.resources.toLocaleString()} resources
              from {stats.groups.toLocaleString()} groups
            </p>
          </div>
          <div className="flex justify-center">
            <SearchBar placeholder="Search resources..." />
          </div>
          <div className="flex justify-center gap-4 mt-10">
            <a href="https://mutualaid.nyc/submit-a-resource/" className="btn btn-primary">
              Submit a Resource
            </a>
            <a href="https://mutualaid.nyc/suggest-a-change/" className="btn btn-primary">
              Suggest a Change
            </a>
          </div>
        </div>
      </section>

      {/* Resource Categories  */}
      {categories.length > 0 && (
        <section className="pt-10 pb-16 px-4 bg-[var(--section-alt)]">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Browse By Category
              </h2>
              <Link
                href="/services"
                className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors underline hover:no-underline"
              >
                View all resources →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map((category) => {
                return (
                  <Link
                    key={category.name}
                    href={`/services?category=${encodeURIComponent(category.name)}`}
                    className="group flex items-center gap-3 p-5 rounded-2xl bg-card-bg border border-[var(--card-border)] hover:shadow-md transition-all"
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {iconFiles.has(`${iconSlug(category.name)}.png`) ? (
                        <img
                          src={`/${ICON_DIR}/${iconSlug(category.name)}.png`}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-black/10 block" />
                      )}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {category.name}
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
