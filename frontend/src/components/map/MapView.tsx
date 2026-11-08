'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre runs its worker from a separate file; this lets Next.js bundle it
// as a hashed asset.
maplibregl.setWorkerUrl(
    new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString(),
);

interface MapLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serviceName?: string;
    serviceId?: string;
    orgName?: string;
}

interface MapViewProps {
    locations: MapLocation[];
    /** ID of the currently highlighted service (e.g. from card hover). */
    highlightedId?: string | null;
}

/** Pin icon dimensions. */
const PIN_W = 28;
const PIN_H = 40;

/**
 * Basemap style. Defaults to OpenFreeMap "bright" — a free, open vector
 * basemap built from OpenStreetMap data with no API key, no registration,
 * no user tracking, and no request limits.
 *
 * OpenFreeMap can also be self-hosted; set NEXT_PUBLIC_BASEMAP_STYLE_URL to
 * point at our own instance (or an alternative style) without a code change.
 */
const BASEMAP_STYLE_URL =
    process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ||
    'https://tiles.openfreemap.org/styles/bright';

/**
 * Generate an SVG pin image as a data URL for loading into the map sprite.
 * Uses a simple, clean teardrop shape with a dot highlight.
 */
function pinDataUrl(fill: string, stroke: string): string {
    const w = PIN_W;
    const h = PIN_H;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${w / 2},${h - 2}
        C${w / 2 - 2},${h * 0.6} 2,${h * 0.38} 2,${h * 0.33}
        A${w / 2 - 2},${w / 2 - 2} 0 1,1 ${w - 2},${h * 0.33}
        C${w - 2},${h * 0.38} ${w / 2 + 2},${h * 0.6} ${w / 2},${h - 2}Z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="${w / 2}" cy="${h * 0.3}" r="${w * 0.14}" fill="white" opacity="0.5"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Escape text for the popup's HTML, which is built from Airtable data. */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * MapLibre needs WebGL2. Without it the Map constructor throws, which would
 * take the whole page down, so check first.
 */
function supportsWebGL2(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
}

/**
 * Build a GeoJSON FeatureCollection from locations.
 */
function toGeoJSON(locations: MapLocation[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: locations.map(loc => ({
            type: 'Feature' as const,
            geometry: {
                type: 'Point' as const,
                coordinates: [loc.longitude, loc.latitude],
            },
            properties: {
                id: loc.serviceId || loc.id,
                name: loc.serviceName || loc.name,
                serviceId: loc.serviceId || '',
                orgName: loc.orgName || '',
            },
        })),
    };
}

/** Zoom the map to show every location. */
function fitToLocations(map: maplibregl.Map, locations: MapLocation[]) {
    if (locations.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    locations.forEach(loc => bounds.extend([loc.longitude, loc.latitude]));
    map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
}

/**
 * Interactive map using MapLibre GL with native symbol layers.
 *
 * Pins are rendered on the WebGL canvas (not DOM elements), so they
 * move perfectly in sync with the map during pan/zoom — no lag.
 */
export default function MapView({ locations, highlightedId }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    // The latest pins, for when the map finishes loading.
    const locationsRef = useRef(locations);
    const [canRender] = useState(supportsWebGL2);

    // Initialize map once; pin changes go through setData below, not a new map.
    useEffect(() => {
        if (!canRender || !mapContainer.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: BASEMAP_STYLE_URL,
            center: [-74.006, 40.7128],
            zoom: 10,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            // Load pin images into the map sprite
            const defaultImg = new Image();
            defaultImg.onload = () => {
                if (mapRef.current !== map) return; // removed while loading
                map.addImage('pin-default', defaultImg);

                const hlImg = new Image();
                hlImg.onload = () => {
                    if (mapRef.current !== map) return;
                    map.addImage('pin-highlight', hlImg);
                    addLayers();
                };
                hlImg.src = pinDataUrl('#f59e0b', '#b45309');
            };
            defaultImg.src = pinDataUrl('#8F2D24', '#6b1f18');
        });

        function addLayers() {
            // Main pins source
            map.addSource('pins', { type: 'geojson', data: toGeoJSON(locationsRef.current) });

            // Default pins layer
            map.addLayer({
                id: 'pins-layer',
                type: 'symbol',
                source: 'pins',
                layout: {
                    'icon-image': 'pin-default',
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                },
            });

            // Highlighted pin source (single feature, updated on highlight change)
            map.addSource('pin-highlight', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });

            map.addLayer({
                id: 'pin-highlight-layer',
                type: 'symbol',
                source: 'pin-highlight',
                layout: {
                    'icon-image': 'pin-highlight',
                    'icon-size': 1.25,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                },
            });

            // Click handler — show popup
            map.on('click', 'pins-layer', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
                const props = feature.properties;

                // Remove existing popup
                popupRef.current?.remove();

                const linkHref = props.serviceId
                    ? `/services/${encodeURIComponent(props.serviceId)}`
                    : '/services';
                const linkText = props.serviceId ? 'View resource details →' : 'Browse resources →';

                const popup = new maplibregl.Popup({ offset: [0, -PIN_H] })
                    .setLngLat(coords)
                    .setHTML(`
                        <div class="popup-content">
                            <h4 class="popup-title">${escapeHtml(props.name)}</h4>
                            ${props.orgName
                            ? `<p class="popup-org">${escapeHtml(props.orgName)}</p>`
                            : ''}
                            <a href="${linkHref}" class="popup-link">${linkText}</a>
                        </div>
                    `)
                    .addTo(map);

                popupRef.current = popup;
            });

            // Cursor pointer on hover
            map.on('mouseenter', 'pins-layer', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'pins-layer', () => {
                map.getCanvas().style.cursor = '';
            });

            fitToLocations(map, locationsRef.current);
        }

        return () => {
            popupRef.current?.remove();
            map.remove();
            mapRef.current = null;
        };
    }, [canRender]);

    // New pins (search or filters): swap the data and zoom to fit, keeping the map.
    useEffect(() => {
        locationsRef.current = locations;
        const map = mapRef.current;
        const pins = map?.getSource('pins') as maplibregl.GeoJSONSource | undefined;
        if (!map || !pins) return; // not loaded yet: addLayers reads locationsRef
        pins.setData(toGeoJSON(locations));
        // Zoom once typing pauses, so the map doesn't jump and reload tiles on every letter.
        const timer = setTimeout(() => fitToLocations(map, locations), 500);
        return () => clearTimeout(timer);
    }, [locations]);

    // React to highlight changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        // Check that sources exist (layers loaded)
        if (!map.getSource('pin-highlight')) return;

        if (!highlightedId) {
            // Clear highlight
            (map.getSource('pin-highlight') as maplibregl.GeoJSONSource)
                .setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        // Find the highlighted location
        const loc = locations.find(l => (l.serviceId || l.id) === highlightedId);
        if (!loc) {
            // No matching pin — reset view
            fitToLocations(map, locations);
            return;
        }

        // Set highlight pin
        (map.getSource('pin-highlight') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] },
                properties: { id: loc.serviceId || loc.id, name: loc.serviceName || loc.name },
            }],
        });

        // Fly to highlighted pin
        map.flyTo({
            center: [loc.longitude, loc.latitude],
            zoom: Math.max(map.getZoom(), 14),
            duration: 800,
        });
    }, [highlightedId, locations]);

    if (!canRender) {
        return (
            <div className="w-full h-full min-h-[400px] bg-[var(--section-alt)] flex items-center justify-center p-4 text-center">
                <p className="text-[var(--muted)]">This browser can&apos;t show the map.</p>
            </div>
        );
    }

    return (
        <div
            ref={mapContainer}
            className="w-full h-full min-h-[400px]"
        />
    );
}
