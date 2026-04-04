import type { BaseTelemetry, ComponentStatus, CommunicationStatus, HealthLabel, TopFactor, RootCauseCandidate } from './common';

// ──── TE33A Raw Telemetry ────

export interface TE33ATelemetry extends BaseTelemetry {
  locomotive_model: 'TE33A';

  // Diesel engine
  engine_status: ComponentStatus;
  engine_rpm: number;
  engine_load_pct: number;

  // Fuel
  fuel_level_pct: number;
  fuel_consumption_lph: number;

  // Propulsion & braking
  propulsion_system_status: ComponentStatus;
  dynamic_brake_status: ComponentStatus;

  // Auxiliary systems
  compressor_status: ComponentStatus;
  auxiliaries_status: ComponentStatus;

  // Diagnostics
  onboard_diagnostic_status: ComponentStatus;
  remote_diagnostic_alert: string | null;

  // Crew / computer
  crew_interface_status: ComponentStatus;
  computer_system_status: ComponentStatus;
  communications_status: CommunicationStatus;
}

// ──── TE33A Processed Analytics ────

export interface TE33AProcessed {
  locomotive_model: 'TE33A';
  locomotive_id: string;
  timestamp_utc: string;

  health_index: number;
  health_status: HealthLabel;

  engine_health_score: number;
  engine_overload_risk: number;
  fuel_efficiency_score: number;
  fuel_anomaly_score: number;
  fuel_remaining_eta_h: number;
  propulsion_health_score: number;
  dynamic_brake_availability_score: number;
  brake_risk: number;
  compressor_readiness_score: number;
  maintenance_alert_score: number;
  fault_severity_score: number;
  maintenance_priority_score: number;

  root_cause_candidates: RootCauseCandidate[];
  recommended_action: string;
  recommended_maintenance_action: string;
  top_factors: TopFactor[];
}
