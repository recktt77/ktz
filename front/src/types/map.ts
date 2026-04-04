// ──── Map Service types ────

export interface Railway {
  id: string;
  name: string;
  total_km: number;
}

export interface MapStation {
  id: string;
  name: string;
  railway_id: string;
  position_km: number;
  latitude?: number;
  longitude?: number;
}

export interface TrackSegment {
  id: string;
  railway_id: string;
  from_station_id: string;
  to_station_id: string;
  from_km: number;
  to_km: number;
  length_km: number;
}

export interface StationTrackCoverage {
  station_id: string;
  track_segment_id: string;
  km_from: number;
  km_to: number;
}

export interface SpeedLimit {
  id: string;
  track_segment_id: string;
  from_km: number;
  to_km: number;
  limit_kmh: number;
  reason: string;
}

export interface MapOverview {
  railways: Railway[];
  stations: MapStation[];
  segments: TrackSegment[];
  speed_limits: SpeedLimit[];
}

export interface LocomotivePosition {
  locomotive_id: string;
  track_segment_id: string;
  position_km: number;
  speed_kmh: number;
  heading: 'forward' | 'backward';
}
