import { Suspense } from 'react';
import { Metadata } from 'next';
import { getMapData } from '@/lib/data';
import MapPageClient from './MapPageClient';
import { PAGE } from '@/lib/styles';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Find community resources on an interactive map.',
};

/**
 * Services page — interactive map with filters and search.
 * Suspense boundary required because MapPageClient uses useSearchParams().
 */
export default function ServicesPage() {
    const { services, needCategories, communityCategories, serviceAreas } = getMapData();

    return (
        <Suspense
            fallback={
                <div className={`${PAGE} py-8 text-center text-muted`}>Loading resources…</div>
            }
        >
            <MapPageClient
                services={services}
                needCategories={needCategories}
                communityCategories={communityCategories}
                serviceAreas={serviceAreas}
            />
        </Suspense>
    );
}
