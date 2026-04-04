import type { LocomotiveModel, ComponentStatus, CommunicationStatus } from './common';

// ──── Fleet summary base (Supervisor) ────

interface FleetEntryBase {
  locomotive_id: string;
  locomotive_model: LocomotiveModel;
  timestamp_utc: string;
  health_index: number;
  fault_code: string | null;
  alert_count: number;
  communication_status: CommunicationStatus;
  brake_system_status: ComponentStatus;

  // Processed
  availability_score: number;
  downtime_risk_score: number;
  maintenance_priority_score: number;
  criticality_rank: number;
  fleet_health_contribution: number;
  operational_status_summary: string;
}

export interface KZ8AFleetEntry extends FleetEntryBase {
  locomotive_model: 'KZ8A';
  pantograph_status: ComponentStatus;
  main_transformer_status: ComponentStatus;
  traction_drive_status: ComponentStatus;
}

export interface TE33AFleetEntry extends FleetEntryBase {
  locomotive_model: 'TE33A';
  engine_status: ComponentStatus;
  fuel_level_pct: number;
  propulsion_system_status: ComponentStatus;
  dynamic_brake_status: ComponentStatus;
  fuel_readiness_score: number;
}

export type FleetEntry = KZ8AFleetEntry | TE33AFleetEntry;

export function isKZ8AFleet(e: FleetEntry): e is KZ8AFleetEntry {
  return e.locomotive_model === 'KZ8A';
}

export function isTE33AFleet(e: FleetEntry): e is TE33AFleetEntry {
  return e.locomotive_model === 'TE33A';
}
