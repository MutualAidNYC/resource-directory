import { Suspense } from "react";
import { Metadata } from "next";
import { getMapData } from "@/lib/data";
import MapPageClient from "./MapPageClient";

export const metadata: Metadata = {
    title: "Services",
    description: "Find community services and resources on an interactive map.",
};

/**
 * Services page — interactive map with filters, search, and proximity sorting.
 * Suspense boundary required because MapPageClient uses useSearchParams().
 */
export default function ServicesPage() {
    const { services, needCategories, communityCategories, serviceAreas } = getMapData();

    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8 text-center text-[var(--muted)]">
                Loading resources…
            </div>
        }>
            <MapPageClient
                services={services}
                needCategories={needCategories}
                communityCategories={communityCategories}
                serviceAreas={serviceAreas}
            />
        </Suspense>
    );
}
