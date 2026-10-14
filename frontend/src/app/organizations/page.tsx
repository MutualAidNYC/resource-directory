import { Suspense } from "react";
import { Metadata } from "next";
import { listOrganizations } from "@/lib/data";
import OrganizationsPageClient, { OrganizationGrid } from "./OrganizationsPageClient";

export const metadata: Metadata = {
    title: "Groups",
    description: "Browse groups providing community resources.",
};

/**
 * Groups page: every group, filtered in the browser as you type (`?q=`).
 * Suspense boundary required because the client component reads useSearchParams();
 * until it loads, the full list shows.
 */
export default function OrganizationsPage() {
    const organizations = listOrganizations();

    return (
        <Suspense fallback={<OrganizationGrid organizations={organizations} />}>
            <OrganizationsPageClient organizations={organizations} />
        </Suspense>
    );
}
