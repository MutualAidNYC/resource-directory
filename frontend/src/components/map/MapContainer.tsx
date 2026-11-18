'use client';

import dynamic from 'next/dynamic';

/**
 * The map (MapView), loaded only in the browser: MapLibre needs `window` and WebGL.
 * Every page uses this one. Put it in a parent with a height; it fills it.
 */
export const MapContainer = dynamic(() => import('./MapView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-section-alt flex items-center justify-center">
            <p className="text-muted text-sm">Loading map…</p>
        </div>
    ),
});
