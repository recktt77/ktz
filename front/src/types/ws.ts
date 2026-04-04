import type { LocomotiveTelemetry, LocomotiveProcessed } from './processed';
import type { AlertItem } from './alerts';
import type { RouteContext } from './route';
import type { FleetEntry } from './fleet';
import type { DispatcherOverlay } from './roles';

// ──── Snapshot ────

export interface LocomotiveSnapshot {
  telemetry: LocomotiveTelemetry;
  processed: LocomotiveProcessed;
  alerts: AlertItem[];
  route: RouteContext | null;
}

export interface SnapshotPayload {
  role: string;
  locomotives: LocomotiveSnapshot[];
}

// ──── Status update ────

export interface LocomotiveStatusUpdate {
  locomotive_id: string;
  operational_status_summary: string;
  timestamp_utc: string;
}

// ──── Top-level WS message discriminated union ────

export type WSMessage =
  | { type: 'snapshot_init'; payload: SnapshotPayload }
  | { type: 'telemetry_update'; payload: LocomotiveTelemetry }
  | { type: 'processed_update'; payload: LocomotiveProcessed }
  | { type: 'alert_created'; payload: AlertItem }
  | { type: 'alert_resolved'; payload: { id: string; locomotive_id: string } }
  | { type: 'route_context_update'; payload: RouteContext }
  | { type: 'dispatcher_overlay_update'; payload: DispatcherOverlay }
  | { type: 'fleet_summary_update'; payload: FleetEntry[] }
  | { type: 'locomotive_status_update'; payload: LocomotiveStatusUpdate }
  | { type: 'pong'; payload: null };
