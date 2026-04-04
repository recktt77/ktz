/**
 * Map Service API client.
 * Maps to Map Service endpoints (GET /railways, /stations, /track-segments, etc.)
 * Transforms backend field names to frontend types.
 */
import { createApiClient } from './client';
import { MAP_API_URL } from '@/lib/constants';
import type { Railway, MapStation, TrackSegment, MapOverview, SpeedLimit } from '@/types';
import type { MapStationNode, MapRouteDefinition } from '@/types/railwayMap';

const api = createApiClient(MAP_API_URL);

// ──── Backend response types (raw from Map Service) ────

interface RawRailway {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_length_km: number;
}

interface RawStation {
  id: string;
  name: string;
  code: string;
  name_kz?: string;
  station_type?: string;
  railway_id: string;
  position_km: number;
  latitude?: number;
  longitude?: number;
}

interface RawTrackSegment {
  id: string;
  code: string;
  name?: string;
  railway_id: string;
  start_station_id: string;
  end_station_id: string;
  start_km: number;
  end_km: number;
  length_km: number;
  waypoints?: [number, number][];
}

interface RawSpeedLimit {
  id: string;
  track_segment_id: string;
  km_from: number;
  km_to: number;
  max_speed_kmh: number;
  reason?: string;
}

interface RawOverview {
  railways: RawRailway[];
  stations: RawStation[];
  segments: RawTrackSegment[];
  speed_limits: RawSpeedLimit[];
}

// ──── Mappers ────

function mapRailway(r: RawRailway): Railway {
  return { id: r.id, name: r.name, total_km: Number(r.total_length_km) };
}

function mapStation(s: RawStation): MapStation {
  return {
    id: s.id,
    name: s.name,
    railway_id: s.railway_id,
    position_km: Number(s.position_km),
    latitude: s.latitude ? Number(s.latitude) : undefined,
    longitude: s.longitude ? Number(s.longitude) : undefined,
  };
}

function mapStationToNode(s: RawStation): MapStationNode {
  return {
    id: s.code,
    name: s.name,
    nameKz: s.name_kz ?? s.name,
    latitude: s.latitude ? Number(s.latitude) : 0,
    longitude: s.longitude ? Number(s.longitude) : 0,
    type: (s.station_type as MapStationNode['type']) ?? 'station',
  };
}

function mapSegment(seg: RawTrackSegment): TrackSegment {
  return {
    id: seg.id,
    railway_id: seg.railway_id,
    from_station_id: seg.start_station_id,
    to_station_id: seg.end_station_id,
    from_km: Number(seg.start_km),
    to_km: Number(seg.end_km),
    length_km: Number(seg.length_km),
  };
}

function mapSegmentToRoute(seg: RawTrackSegment): MapRouteDefinition {
  // Strip "SEG-" prefix from code to match frontend route ID convention
  const id = seg.code.replace(/^SEG-/, '');
  return {
    id,
    from_station_id: seg.start_station_id,
    to_station_id: seg.end_station_id,
    name: seg.name ?? seg.code,
    waypoints: seg.waypoints ?? [],
    distance_km: Number(seg.length_km),
  };
}

function mapSpeedLimit(sl: RawSpeedLimit): SpeedLimit {
  return {
    id: sl.id,
    track_segment_id: sl.track_segment_id,
    from_km: Number(sl.km_from),
    to_km: Number(sl.km_to),
    limit_kmh: sl.max_speed_kmh,
    reason: sl.reason ?? '',
  };
}

// ──── Railways ────

export async function getRailways(): Promise<Railway[]> {
  const raw = await api.get<RawRailway[]>('/railways');
  return raw.map(mapRailway);
}

export async function createRailway(data: Omit<Railway, 'id'>): Promise<Railway> {
  return api.post<Railway>('/railways', data);
}

// ──── Stations ────

export async function getStations(): Promise<MapStation[]> {
  const raw = await api.get<RawStation[]>('/stations');
  return raw.map(mapStation);
}

export async function getStationNodes(): Promise<MapStationNode[]> {
  const raw = await api.get<RawStation[]>('/stations');
  return raw.map(mapStationToNode);
}

export async function createStation(data: Omit<MapStation, 'id'>): Promise<MapStation> {
  return api.post<MapStation>('/stations', data);
}

// ──── Track segments ────

export async function getTrackSegments(): Promise<TrackSegment[]> {
  const raw = await api.get<RawTrackSegment[]>('/track-segments');
  return raw.map(mapSegment);
}

export async function getRouteDefinitions(): Promise<MapRouteDefinition[]> {
  const raw = await api.get<RawTrackSegment[]>('/track-segments');
  return raw.map(mapSegmentToRoute);
}

export async function createTrackSegment(data: Omit<TrackSegment, 'id'>): Promise<TrackSegment> {
  return api.post<TrackSegment>('/track-segments', data);
}

// ──── Map overview ────

export async function getMapOverview(): Promise<MapOverview> {
  const raw = await api.get<RawOverview>('/map/overview');
  return {
    railways: raw.railways.map(mapRailway),
    stations: raw.stations.map(mapStation),
    segments: raw.segments.map(mapSegment),
    speed_limits: (raw.speed_limits ?? []).map(mapSpeedLimit),
  };
}

/** Full map data for rendering (stations as nodes, segments as routes) */
export async function getMapRenderData(): Promise<{
  stations: MapStationNode[];
  routes: MapRouteDefinition[];
  overview: MapOverview;
}> {
  const raw = await api.get<RawOverview>('/map/overview');

  // Build UUID → station code lookup for route station ID mapping
  const stationCodeById = new Map<string, string>();
  for (const s of raw.stations) {
    stationCodeById.set(s.id, s.code);
  }

  const stations = raw.stations.map(mapStationToNode);

  const routes = raw.segments.map((seg): MapRouteDefinition => {
    const id = seg.code.replace(/^SEG-/, '');
    return {
      id,
      from_station_id: stationCodeById.get(seg.start_station_id) ?? seg.start_station_id,
      to_station_id: stationCodeById.get(seg.end_station_id) ?? seg.end_station_id,
      name: seg.name ?? seg.code,
      waypoints: seg.waypoints ?? [],
      distance_km: Number(seg.length_km),
    };
  });

  return {
    stations,
    routes,
    overview: {
      railways: raw.railways.map(mapRailway),
      stations: raw.stations.map(mapStation),
      segments: raw.segments.map(mapSegment),
      speed_limits: (raw.speed_limits ?? []).map(mapSpeedLimit),
    },
  };
}

export async function getStationMap(stationId: string): Promise<MapOverview> {
  return api.get<MapOverview>(`/map/station/${encodeURIComponent(stationId)}`);
}

export async function getSegmentMap(segmentId: string): Promise<MapOverview> {
  return api.get<MapOverview>(`/map/segment/${encodeURIComponent(segmentId)}`);
}

// ──── Speed limits ────

export async function getSpeedLimits(segmentId: string): Promise<SpeedLimit[]> {
  const raw = await api.get<RawSpeedLimit[]>(`/speed-limits?segment_id=${encodeURIComponent(segmentId)}`);
  return raw.map(mapSpeedLimit);
}
