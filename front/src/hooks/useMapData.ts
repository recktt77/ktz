import { useState, useEffect } from 'react';
import { getMapRenderData } from '@/services/api/mapService';
import { STATIONS, ROUTES } from '@/lib/kazakhstanData';
import type { MapStationNode, MapRouteDefinition } from '@/types/railwayMap';
import type { MapOverview } from '@/types';

interface MapData {
  stations: MapStationNode[];
  routes: MapRouteDefinition[];
  overview: MapOverview | null;
  loading: boolean;
  error: string | null;
  source: 'api' | 'mock';
}

/**
 * Fetches map topology from Map Service REST API.
 * Falls back to hardcoded mock data if the service is unavailable.
 */
export function useMapData(): MapData {
  const [data, setData] = useState<MapData>({
    stations: STATIONS,
    routes: ROUTES,
    overview: null,
    loading: true,
    error: null,
    source: 'mock',
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        console.log('[useMapData] Fetching from API…');
        const result = await getMapRenderData();
        console.log('[useMapData] API response:', result.stations.length, 'stations,', result.routes.length, 'routes');

        if (cancelled) return;

        // Only use API data if it actually has stations and routes with waypoints
        const hasValidData =
          result.stations.length > 0 &&
          result.routes.length > 0 &&
          result.routes.some((r) => r.waypoints.length > 0);

        if (hasValidData) {
          setData({
            stations: result.stations,
            routes: result.routes,
            overview: result.overview,
            loading: false,
            error: null,
            source: 'api',
          });
        } else {
          setData((prev) => ({
            ...prev,
            overview: result.overview,
            loading: false,
            error: null,
            source: 'mock',
          }));
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Map Service unavailable';
        console.warn('[useMapData] Falling back to mock data:', message);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: message,
          source: 'mock',
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
