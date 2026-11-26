'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TITLE_LINK } from '@/lib/styles';
import { site } from '@/site.config';

// MapLibre runs its worker from a separate file; this lets Next.js bundle it
// as a hashed asset.
maplibregl.setWorkerUrl(
    new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString(),
);

/** One pin. Every map on the site passes these (via MapContainer). */
export interface MapLocation {
    id: string;
    /** The popup's title (the link, when there's an `href`). */
    name: string;
    latitude: number;
    longitude: number;
    /** The popup's second line: the resource's group. */
    orgName?: string;
    /** The popup links here; no link without it. */
    href?: string;
}

interface MapViewProps {
    locations: MapLocation[];
    /** ID of the currently highlighted service (e.g. from card hover). */
    highlightedId?: string | null;
    /**
     * Add MapLibre's "Show my location on the map" button (the /services map only). The
     * browser asks for the location only when it's pressed; the location stays in the
     * browser and isn't tracked as the visitor moves.
     */
    showLocateButton?: boolean;
    /** Without WebGL, shows a "Use the list" button that calls this (the /services map). */
    onUseList?: () => void;
}

/** Past this zoom pins never cluster, so "View on map" zooms beyond it to show its pin. */
const CLUSTER_MAX_ZOOM = 14;

/**
 * Basemap style. Defaults to OpenFreeMap "positron" (muted, so the pins stand out) — a free, open vector
 * basemap built from OpenStreetMap data with no API key, no registration,
 * no user tracking, and no request limits.
 *
 * OpenFreeMap can also be self-hosted; set NEXT_PUBLIC_BASEMAP_STYLE_URL to
 * point at our own instance (or an alternative style) without a code change.
 */
const BASEMAP_STYLE_URL =
    process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron';

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
        features: locations.map((loc) => ({
            type: 'Feature' as const,
            geometry: {
                type: 'Point' as const,
                coordinates: [loc.longitude, loc.latitude],
            },
            properties: {
                id: loc.id,
                name: loc.name,
                orgName: loc.orgName ?? '',
                href: loc.href ?? '',
            },
        })),
    };
}

/** Zoom the map to show every location. */
function fitToLocations(map: maplibregl.Map, locations: MapLocation[]) {
    if (locations.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    locations.forEach((loc) => bounds.extend([loc.longitude, loc.latitude]));
    map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
}

/**
 * Highlight a pin and zoom past the clusters to it. False (and no highlight) when there's
 * no id or its pin isn't among the locations.
 */
function showHighlight(
    map: maplibregl.Map,
    id: string | null | undefined,
    locations: MapLocation[],
) {
    const loc = id ? locations.find((l) => l.id === id) : undefined;
    (map.getSource('pin-highlight') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: loc
            ? [
                  {
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] },
                      properties: {},
                  },
              ]
            : [],
    });
    if (!loc) return false;
    map.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1.5),
        duration: 800,
    });
    return true;
}

/**
 * Interactive map using MapLibre GL. Pins are circle layers on the WebGL canvas (not DOM
 * elements), so they move in sync with the map; nearby pins cluster into a count.
 * MapLibre's flyTo/easeTo already jump instead of animating under prefers-reduced-motion.
 */
export default function MapView({
    locations,
    highlightedId,
    showLocateButton,
    onUseList,
}: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    // The latest pins, for when the map finishes loading.
    const locationsRef = useRef(locations);
    const highlightedIdRef = useRef(highlightedId);
    const [canRender] = useState(supportsWebGL2);

    // Initialize map once; pin changes go through setData below, not a new map.
    useEffect(() => {
        if (!canRender || !mapContainer.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: BASEMAP_STYLE_URL,
            center: site.map.center,
            zoom: site.map.zoom,
            locale: { 'GeolocateControl.FindMyLocation': 'Show my location on the map' },
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        // Defaults: one position per press, no tracking, accuracy circle on.
        if (showLocateButton) map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            map.addSource('pins', {
                type: 'geojson',
                data: toGeoJSON(locationsRef.current),
                cluster: true,
                clusterRadius: 40,
                clusterMaxZoom: CLUSTER_MAX_ZOOM,
            });
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'pins',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#204045',
                    'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 24],
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff',
                },
            });
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'pins',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': ['get', 'point_count_abbreviated'],
                    'text-font': ['Noto Sans Bold'],
                    'text-size': 13,
                },
                paint: { 'text-color': '#ffffff' },
            });
            map.addLayer({
                id: 'pins-layer',
                type: 'circle',
                source: 'pins',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#8f2d24',
                    'circle-radius': 8,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                },
            });
            // Brand yellow, with a teal edge so it shows on the basemap.
            map.addSource('pin-highlight', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            });
            map.addLayer({
                id: 'pin-highlight-layer',
                type: 'circle',
                source: 'pin-highlight',
                paint: {
                    'circle-color': '#f7cf56',
                    'circle-radius': 12,
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#204045',
                },
            });

            // A cluster opens up to the zoom where it splits.
            map.on('click', 'clusters', async (e) => {
                const feature = e.features?.[0];
                if (!feature) return;
                const source = map.getSource('pins') as maplibregl.GeoJSONSource;
                const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
                map.easeTo({
                    center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
                    zoom,
                });
            });

            // Click handler — show popup
            map.on('click', 'pins-layer', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
                    number,
                    number,
                ];
                const props = feature.properties;

                // Remove existing popup
                popupRef.current?.remove();

                // Like the cards: the name is the link (when there is one), the organization below.
                const name = escapeHtml(props.name);
                const title = props.href
                    ? `<a href="${escapeHtml(props.href)}" class="popup-title ${TITLE_LINK}">${name}</a>`
                    : `<p class="popup-title text-tertiary">${name}</p>`;
                const org = props.orgName
                    ? `<p class="popup-org">${escapeHtml(props.orgName)}</p>`
                    : '';
                const popup = new maplibregl.Popup({ offset: 10 })
                    .setLngLat(coords)
                    .setHTML(`<div class="popup-content">${title}${org}</div>`)
                    .addTo(map);

                popupRef.current = popup;
            });

            for (const layer of ['pins-layer', 'clusters']) {
                map.on('mouseenter', layer, () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', layer, () => {
                    map.getCanvas().style.cursor = '';
                });
            }

            // Opened from "View on map": go to that pin; otherwise show them all.
            if (!showHighlight(map, highlightedIdRef.current, locationsRef.current)) {
                fitToLocations(map, locationsRef.current);
            }
        });

        return () => {
            popupRef.current?.remove();
            map.remove();
            mapRef.current = null;
        };
    }, [canRender, showLocateButton]);

    // New pins (search or filters): swap the data and zoom to fit (or to the highlighted
    // pin), keeping the map.
    useEffect(() => {
        locationsRef.current = locations;
        const map = mapRef.current;
        const pins = map?.getSource('pins') as maplibregl.GeoJSONSource | undefined;
        if (!map || !pins) return; // not loaded yet: the load handler reads locationsRef
        pins.setData(toGeoJSON(locations));
        // Zoom once typing pauses, so the map doesn't jump and reload tiles on every letter.
        const timer = setTimeout(() => {
            if (!showHighlight(map, highlightedIdRef.current, locations)) {
                fitToLocations(map, locations);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [locations]);

    // "View on map" on another resource while the map is open.
    useEffect(() => {
        highlightedIdRef.current = highlightedId;
        const map = mapRef.current;
        if (!map?.getSource('pin-highlight')) return; // not loaded yet: the load handler does it
        if (!showHighlight(map, highlightedId, locationsRef.current)) {
            fitToLocations(map, locationsRef.current);
        }
    }, [highlightedId]);

    if (!canRender) {
        return (
            <div className="w-full h-full bg-section-alt flex flex-col items-center justify-center p-4 text-center">
                <p className="text-muted">This browser can&apos;t show the map.</p>
                {onUseList && (
                    <button type="button" onClick={onUseList} className="btn btn-secondary mt-4">
                        Use the list
                    </button>
                )}
            </div>
        );
    }

    return <div ref={mapContainer} className="w-full h-full" />;
}
