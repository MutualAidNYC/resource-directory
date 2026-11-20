import { MapContainer } from '@/components/map/MapContainer';
import type { MapLocation } from '@/components/map/MapView';
import { FRAME } from '@/lib/styles';

/**
 * A detail page's map column: an h2 ("Location", or "Locations (N)" counting places,
 * not pins: several resources can share one address) over the framed map. Sticky beside
 * the content on wide screens; after it on phones.
 */
export function MapAside({ locations }: { locations: MapLocation[] }) {
    const places = new Set(locations.map((l) => `${l.latitude},${l.longitude}`)).size;
    return (
        <aside aria-labelledby="map-heading">
            <div className="lg:sticky lg:top-6">
                <h2 id="map-heading" className="mb-4">
                    {places === 1 ? 'Location' : `Locations (${places})`}
                </h2>
                <div className={`h-[300px] bg-card-bg ${FRAME}`}>
                    <MapContainer locations={locations} />
                </div>
            </div>
        </aside>
    );
}
