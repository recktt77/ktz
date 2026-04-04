import type { LocomotiveModel, CommunicationStatus, MetricStatus } from './common';

// ──── Map rendering types ────

export interface MapStationNode {
  id: string;
  name: string;
  nameKz: string;
  latitude: number;
  longitude: number;
  type: 'hub' | 'junction' | 'station';
}

export interface MapRouteDefinition {
  id: string;
  from_station_id: string;
  to_station_id: string;
  name: string;
  waypoints: [number, number][]; // [lat, lng][]
  distance_km: number;
}

export interface FleetMapItem {
  locomotive_id: string;
  locomotive_model: LocomotiveModel;
  route_id: string;
  from_station: string;
  to_station: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  health_index: number;
  health_status: MetricStatus;
  communication_status: CommunicationStatus;
  heading_deg: number;
  progress: number; // 0..1
  last_update: number;
}

export type MapStatusFilter = 'all' | 'normal' | 'warning' | 'critical';

export interface MapViewportState {
  center: [number, number];
  zoom: number;
}
