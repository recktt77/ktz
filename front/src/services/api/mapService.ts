/**
 * Map Service API client.
 * Maps to Map Service endpoints (GET /railways, /stations, /track-segments, etc.)
 */
import { createApiClient } from './client';
import { MAP_API_URL } from '@/lib/constants';
import type { Railway, MapStation, TrackSegment, MapOverview, SpeedLimit } from '@/types';

const api = createApiClient(MAP_API_URL);

// ──── Railways ────

export async function getRailways(): Promise<Railway[]> {
  return api.get<Railway[]>('/railways');
}

export async function createRailway(data: Omit<Railway, 'id'>): Promise<Railway> {
  return api.post<Railway>('/railways', data);
}

// ──── Stations ────

export async function getStations(): Promise<MapStation[]> {
  return api.get<MapStation[]>('/stations');
}

export async function createStation(data: Omit<MapStation, 'id'>): Promise<MapStation> {
  return api.post<MapStation>('/stations', data);
}

// ──── Track segments ────

export async function getTrackSegments(): Promise<TrackSegment[]> {
  return api.get<TrackSegment[]>('/track-segments');
}

export async function createTrackSegment(data: Omit<TrackSegment, 'id'>): Promise<TrackSegment> {
  return api.post<TrackSegment>('/track-segments', data);
}

// ──── Map overview ────

export async function getMapOverview(): Promise<MapOverview> {
  return api.get<MapOverview>('/map/overview');
}

export async function getStationMap(stationId: string): Promise<MapOverview> {
  return api.get<MapOverview>(`/map/station/${encodeURIComponent(stationId)}`);
}

export async function getSegmentMap(segmentId: string): Promise<MapOverview> {
  return api.get<MapOverview>(`/map/segment/${encodeURIComponent(segmentId)}`);
}

// ──── Speed limits ────

export async function getSpeedLimits(segmentId: string): Promise<SpeedLimit[]> {
  return api.get<SpeedLimit[]>(`/track-segments/${encodeURIComponent(segmentId)}/speed-limits`);
}
