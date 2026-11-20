import { Suspense } from 'react';
import { Metadata } from 'next';
import { getMapData } from '@/lib/data';
import MapPageClient, { ResourceGrid } from './MapPageClient';
import { BAR, PAGE } from '@/lib/styles';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Search community resources in New York, as a list or on a map.',
};

/**
 * Services page: the list with search and filters, or the map.
 * Suspense boundary required because MapPageClient uses useSearchParams(); until it
 * loads (or without JavaScript), the full list shows.
 */
export default function ServicesPage() {
    const { services, needCategories, communityCategories, serviceAreas } = getMapData();

    return (
        <Suspense
            fallback={
                <div className={`${PAGE} pt-10 pb-16`}>
                    <div className={`${BAR} mb-4`} />
                    <h1 className="mb-6">Resources</h1>
                    <p className="mb-4 font-header font-bold text-lg text-secondary">
                        {services.length.toLocaleString()} resources
                    </p>
                    <ResourceGrid services={services} />
                </div>
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
