import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

import { useDashboardStore } from '@/store';
import { useMapData } from '@/hooks/useMapData';
import { interpolateOnPolyline, getHealthStatus } from '@/lib/mapInterpolation';
import { StationLayer } from './StationLayer';
import { RouteLayer } from './RouteLayer';
import { LocomotiveLayer } from './LocomotiveLayer';
import { MapLegend } from './MapLegend';
import { LocomotiveMapPanel } from './LocomotiveMapPanel';
import type { FleetMapItem, MapStatusFilter, MapStationNode, MapRouteDefinition } from '@/types/railwayMap';

// ── Kazakhstan center & bounds ──
const KZ_CENTER: [number, number] = [48.5, 67.5];
const KZ_ZOOM = 5;

// ── Route lookup helpers (work with any station/route arrays) ──

function buildRouteLookups(stations: MapStationNode[], routes: MapRouteDefinition[]) {
  const stationByName = new Map<string, MapStationNode>();
  for (const s of stations) {
    stationByName.set(s.name.toLowerCase(), s);
    stationByName.set(s.nameKz.toLowerCase(), s);
  }

  const routeByStationPair = new Map<string, MapRouteDefinition>();
  const routeById = new Map<string, MapRouteDefinition>();

  for (const r of routes) {
    routeById.set(r.id, r);
    const from = stations.find((s) => s.id === r.from_station_id);
    const to = stations.find((s) => s.id === r.to_station_id);
    if (from && to) {
      routeByStationPair.set(`${from.name.toLowerCase()}->${to.name.toLowerCase()}`, r);
      routeByStationPair.set(`${from.nameKz.toLowerCase()}->${to.nameKz.toLowerCase()}`, r);
    }
  }

  return {
    findRoute(fromName: string, toName: string) {
      const keyFwd = `${fromName.toLowerCase()}->${toName.toLowerCase()}`;
      const fwd = routeByStationPair.get(keyFwd);
      if (fwd) return { route: fwd, reversed: false };

      const keyRev = `${toName.toLowerCase()}->${fromName.toLowerCase()}`;
      const rev = routeByStationPair.get(keyRev);
      if (rev) return { route: rev, reversed: true };

      return null;
    },
    findRouteById(id: string) {
      return routeById.get(id);
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  useMapFleet — merges live store data + ghost fleet
// ══════════════════════════════════════════════════════════════

function useMapFleet(stations: MapStationNode[], routes: MapRouteDefinition[]): FleetMapItem[] {
  const storeRoutes = useDashboardStore((s) => s.routes);
  const telemetry = useDashboardStore((s) => s.telemetry);
  const processed = useDashboardStore((s) => s.processed);

  const lookups = useMemo(() => buildRouteLookups(stations, routes), [stations, routes]);

  return useMemo(() => {
    const items: FleetMapItem[] = [];

    // ── Live locomotives from store (real-time WebSocket data) ──
    for (const [id, route] of Object.entries(storeRoutes)) {
      const tel = telemetry[id];
      const proc = processed[id];
      if (!route) continue;

      const match = lookups.findRoute(route.from, route.to);
      if (!match) continue;

      const wps = match.reversed ? [...match.route.waypoints].reverse() : match.route.waypoints;
      const progress = Math.max(0, Math.min(1, route.position_km / route.totalKm));
      const [lat, lng, heading] = interpolateOnPolyline(wps, progress);

      const hi = proc?.health_index ?? 80;
      items.push({
        locomotive_id: id,
        locomotive_model: tel?.locomotive_model ?? 'KZ8A',
        route_id: route.route_id,
        from_station: route.from,
        to_station: route.to,
        latitude: lat,
        longitude: lng,
        speed_kmh: tel?.speed_kmh ?? 0,
        health_index: hi,
        health_status: getHealthStatus(hi),
        communication_status: tel?.communication_status ?? 'online',
        heading_deg: heading,
        progress,
        last_update: Date.now(),
      });
    }

    return items;
  }, [storeRoutes, telemetry, processed, lookups]);
}

// ══════════════════════════════════════════════════════════════
//  FitBounds — auto-fit map to station bounds
// ══════════════════════════════════════════════════════════════

function FitBounds({ stations }: { stations: MapStationNode[] }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(stations.map((s) => [s.latitude, s.longitude]));
    map.fitBounds(bounds.pad(0.1));
  }, [map, stations]);
  return null;
}

// ══════════════════════════════════════════════════════════════
//  RailwayMap — main component
// ══════════════════════════════════════════════════════════════

interface RailwayMapProps {
  className?: string;
  compact?: boolean; // smaller version for dashboards
}

export function RailwayMap({ className = '', compact = false }: RailwayMapProps) {
  const { stations, routes, loading, source } = useMapData();
  const fleet = useMapFleet(stations, routes);
  const [selectedLocoId, setSelectedLocoId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MapStatusFilter>('all');
  const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null);

  const selectedLoco = useMemo(
    () => fleet.find((f) => f.locomotive_id === selectedLocoId) ?? null,
    [fleet, selectedLocoId],
  );

  const filteredFleet = useMemo(() => {
    if (statusFilter === 'all') return fleet;
    return fleet.filter((f) => f.health_status === statusFilter);
  }, [fleet, statusFilter]);

  const handleLocoClick = useCallback((id: string) => {
    setSelectedLocoId((prev) => (prev === id ? null : id));
    const loco = fleet.find((f) => f.locomotive_id === id);
    if (loco) setHighlightedRoute(loco.route_id);
  }, [fleet]);

  const handleClosePanel = useCallback(() => {
    setSelectedLocoId(null);
    setHighlightedRoute(null);
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-800 ${className}`}>
      {/* Map */}
      <MapContainer
        center={KZ_CENTER}
        zoom={KZ_ZOOM}
        className={compact ? 'h-[400px] w-full' : 'h-[600px] w-full'}
        zoomControl={!compact}
        attributionControl={true}
        style={{ background: '#0f172a' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={18}
        />
        <FitBounds stations={stations} />
        <RouteLayer routes={routes} highlightedRouteId={highlightedRoute} />
        <StationLayer stations={stations} compact={compact} />
        <LocomotiveLayer
          fleet={filteredFleet}
          selectedId={selectedLocoId}
          onSelect={handleLocoClick}
        />
      </MapContainer>

      {/* Legend overlay */}
      <MapLegend
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        fleetCount={fleet.length}
        compact={compact}
      />

      {/* Fleet count / data source badge */}
      <div className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-gray-900/90 px-2.5 py-1 text-xs font-medium text-gray-300 backdrop-blur-sm">
        <span className={`inline-block h-2 w-2 rounded-full ${source === 'api' ? 'bg-green-500' : 'bg-yellow-500'}`} />
        {loading ? 'Loading…' : `${fleet.length} locomotives`}
      </div>

      {/* Side panel */}
      {selectedLoco && (
        <LocomotiveMapPanel loco={selectedLoco} onClose={handleClosePanel} />
      )}
    </div>
  );
}
