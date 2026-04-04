import type { BaseTelemetry, ComponentStatus, HealthLabel, TopFactor, RootCauseCandidate } from './common';

// ──── KZ8A Raw Telemetry ────

export interface KZ8ATelemetry extends BaseTelemetry {
  locomotive_model: 'KZ8A';

  // Catenary / pantograph
  pantograph_status: ComponentStatus;
  catenary_voltage_kv: number;
  catenary_current_a: number;

  // Transformer
  main_transformer_status: ComponentStatus;
  main_transformer_temp_c: number;
  main_transformer_load_pct: number;

  // Traction
  tractive_effort_kn: number;
  traction_drive_status: ComponentStatus;
  traction_converter_status: ComponentStatus;
  traction_converter_temp_c: number;
  traction_converter_load_pct: number;

  // Regenerative braking
  regenerative_braking_status: ComponentStatus;
  regenerative_braking_power_kw: number;
  electrical_brake_status: ComponentStatus;

  // Control / energy
  automatic_pilot_status: ComponentStatus;
  energy_meter_kwh: number;
  energy_consumption_kw: number;
}

// ──── KZ8A Processed Analytics ────

export interface KZ8AProcessed {
  locomotive_model: 'KZ8A';
  locomotive_id: string;
  timestamp_utc: string;

  health_index: number;
  health_status: HealthLabel;

  electrical_supply_risk: number;
  transformer_health_score: number;
  transformer_thermal_risk: number;
  traction_drive_health_score: number;
  converter_thermal_risk: number;
  regen_efficiency_score: number;
  brake_risk: number;
  energy_efficiency_score: number;
  fault_severity_score: number;
  maintenance_priority_score: number;

  root_cause_candidates: RootCauseCandidate[];
  recommended_action: string;
  recommended_maintenance_action: string;
  top_factors: TopFactor[];
}
