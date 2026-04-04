import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

import { useDashboardStore } from '@/store';
import { STATIONS, ROUTES, GHOST_FLEET, findRoute, findRouteById } from '@/lib/kazakhstanData';
import { interpolateOnPolyline, getHealthStatus, getHealthColor } from '@/lib/mapInterpolation';
import { StationLayer } from './StationLayer';
import { RouteLayer } from './RouteLayer';
import { LocomotiveLayer } from './LocomotiveLayer';
import { MapLegend } from './MapLegend';
import { LocomotiveMapPanel } from './LocomotiveMapPanel';
import type { FleetMapItem, MapStatusFilter } from '@/types/railwayMap';

// ── Kazakhstan center & bounds ──
const KZ_CENTER: [number, number] = [48.5, 67.5];
const KZ_ZOOM = 5;

// ══════════════════════════════════════════════════════════════
//  useMapFleet — merges live store data + ghost fleet
// ══════════════════════════════════════════════════════════════

function useMapFleet(): FleetMapItem[] {
  const routes = useDashboardStore((s) => s.routes);
  const telemetry = useDashboardStore((s) => s.telemetry);
  const processed = useDashboardStore((s) => s.processed);

  // Ghost fleet drifts slowly
  const [ghostProgress, setGhostProgress] = useState<Record<string, number>>(
    () => Object.fromEntries(GHOST_FLEET.map((g) => [g.locomotive_id, g.initial_progress])),
  );
  const ghostDir = useRef<Record<string, number>>(
    Object.fromEntries(GHOST_FLEET.map((g) => [g.locomotive_id, 1])),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setGhostProgress((prev) => {
        const next = { ...prev };
        for (const g of GHOST_FLEET) {
          const step = 0.004 * g.speed_factor;
          let val = next[g.locomotive_id] + step * ghostDir.current[g.locomotive_id];
          if (val >= 0.98) { val = 0.98; ghostDir.current[g.locomotive_id] = -1; }
          if (val <= 0.02) { val = 0.02; ghostDir.current[g.locomotive_id] = 1; }
          next[g.locomotive_id] = val;
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const items: FleetMapItem[] = [];

    // ── Live locomotives from store ──
    for (const [id, route] of Object.entries(routes)) {
      const tel = telemetry[id];
      const proc = processed[id];
      if (!route) continue;

      const match = findRoute(route.from, route.to);
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

    // ── Ghost fleet ──
    for (const g of GHOST_FLEET) {
      const route = findRouteById(g.route_id);
      if (!route) continue;

      const progress = ghostProgress[g.locomotive_id] ?? g.initial_progress;
      const [lat, lng, heading] = interpolateOnPolyline(route.waypoints, progress);

      items.push({
        locomotive_id: g.locomotive_id,
        locomotive_model: g.locomotive_model,
        route_id: g.route_id,
        from_station: g.from_station,
        to_station: g.to_station,
        latitude: lat,
        longitude: lng,
        speed_kmh: 60 + Math.random() * 30,
        health_index: g.health_index,
        health_status: getHealthStatus(g.health_index),
        communication_status: g.communication_status,
        heading_deg: heading,
        progress,
        last_update: Date.now(),
      });
    }

    return items;
  }, [routes, telemetry, processed, ghostProgress]);
}

// ══════════════════════════════════════════════════════════════
//  FitBounds — auto-fit map to Kazakhstan on mount
// ══════════════════════════════════════════════════════════════

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(STATIONS.map((s) => [s.latitude, s.longitude]));
    map.fitBounds(bounds.pad(0.1));
  }, [map]);
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
  const fleet = useMapFleet();
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
        <FitBounds />
        <RouteLayer routes={ROUTES} highlightedRouteId={highlightedRoute} />
        <StationLayer stations={STATIONS} compact={compact} />
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

      {/* Fleet count badge */}
      <div className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-gray-900/90 px-2.5 py-1 text-xs font-medium text-gray-300 backdrop-blur-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        {fleet.length} locomotives
      </div>

      {/* Side panel */}
      {selectedLoco && (
        <LocomotiveMapPanel loco={selectedLoco} onClose={handleClosePanel} />
      )}
    </div>
  );
}
