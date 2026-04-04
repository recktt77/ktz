import { z } from 'zod';

// ──── Shared enums ────

const componentStatusSchema = z.enum(['ok', 'degraded', 'fault', 'offline']);
const communicationStatusSchema = z.enum(['online', 'degraded', 'offline']);
const alertSeveritySchema = z.enum(['info', 'warning', 'critical']);
const healthLabelSchema = z.enum(['Good', 'Warning', 'Critical']);
const locoModelSchema = z.enum(['KZ8A', 'TE33A']);

// ──── Reusable fragments ────

const topFactorSchema = z.object({
  name: z.string(),
  impact: z.number(),
  detail: z.string(),
});

const rootCauseCandidateSchema = z.object({
  component: z.string(),
  probability: z.number(),
  description: z.string(),
});

// ──── KZ8A Telemetry ────

const kz8aTelemetrySchema = z.object({
  locomotive_id: z.string(),
  locomotive_model: z.literal('KZ8A'),
  timestamp_utc: z.string(),
  speed_kmh: z.number(),
  brake_system_status: componentStatusSchema,
  brake_system_pressure_bar: z.number(),
  fault_code: z.string().nullable(),
  communication_status: communicationStatusSchema,
  control_system_status: componentStatusSchema,
  pantograph_status: componentStatusSchema,
  catenary_voltage_kv: z.number(),
  catenary_current_a: z.number(),
  main_transformer_status: componentStatusSchema,
  main_transformer_temp_c: z.number(),
  main_transformer_load_pct: z.number(),
  tractive_effort_kn: z.number(),
  traction_drive_status: componentStatusSchema,
  traction_converter_status: componentStatusSchema,
  traction_converter_temp_c: z.number(),
  traction_converter_load_pct: z.number(),
  regenerative_braking_status: componentStatusSchema,
  regenerative_braking_power_kw: z.number(),
  electrical_brake_status: componentStatusSchema,
  automatic_pilot_status: componentStatusSchema,
  energy_meter_kwh: z.number(),
  energy_consumption_kw: z.number(),
});

// ──── TE33A Telemetry ────

const te33aTelemetrySchema = z.object({
  locomotive_id: z.string(),
  locomotive_model: z.literal('TE33A'),
  timestamp_utc: z.string(),
  speed_kmh: z.number(),
  brake_system_status: componentStatusSchema,
  brake_system_pressure_bar: z.number(),
  fault_code: z.string().nullable(),
  communication_status: communicationStatusSchema,
  control_system_status: componentStatusSchema,
  engine_status: componentStatusSchema,
  engine_rpm: z.number(),
  engine_load_pct: z.number(),
  fuel_level_pct: z.number(),
  fuel_consumption_lph: z.number(),
  propulsion_system_status: componentStatusSchema,
  dynamic_brake_status: componentStatusSchema,
  compressor_status: componentStatusSchema,
  auxiliaries_status: componentStatusSchema,
  onboard_diagnostic_status: componentStatusSchema,
  remote_diagnostic_alert: z.string().nullable(),
  crew_interface_status: componentStatusSchema,
  computer_system_status: componentStatusSchema,
  communications_status: communicationStatusSchema,
});

const telemetrySchema = z.discriminatedUnion('locomotive_model', [
  kz8aTelemetrySchema,
  te33aTelemetrySchema,
]);

// ──── KZ8A Processed ────

const kz8aProcessedSchema = z.object({
  locomotive_model: z.literal('KZ8A'),
  locomotive_id: z.string(),
  timestamp_utc: z.string(),
  health_index: z.number(),
  health_status: healthLabelSchema,
  electrical_supply_risk: z.number(),
  transformer_health_score: z.number(),
  transformer_thermal_risk: z.number(),
  traction_drive_health_score: z.number(),
  converter_thermal_risk: z.number(),
  regen_efficiency_score: z.number(),
  brake_risk: z.number(),
  energy_efficiency_score: z.number(),
  fault_severity_score: z.number(),
  maintenance_priority_score: z.number(),
  root_cause_candidates: z.array(rootCauseCandidateSchema),
  recommended_action: z.string(),
  recommended_maintenance_action: z.string(),
  top_factors: z.array(topFactorSchema),
});

// ──── TE33A Processed ────

const te33aProcessedSchema = z.object({
  locomotive_model: z.literal('TE33A'),
  locomotive_id: z.string(),
  timestamp_utc: z.string(),
  health_index: z.number(),
  health_status: healthLabelSchema,
  engine_health_score: z.number(),
  engine_overload_risk: z.number(),
  fuel_efficiency_score: z.number(),
  fuel_anomaly_score: z.number(),
  fuel_remaining_eta_h: z.number(),
  propulsion_health_score: z.number(),
  dynamic_brake_availability_score: z.number(),
  brake_risk: z.number(),
  compressor_readiness_score: z.number(),
  maintenance_alert_score: z.number(),
  fault_severity_score: z.number(),
  maintenance_priority_score: z.number(),
  root_cause_candidates: z.array(rootCauseCandidateSchema),
  recommended_action: z.string(),
  recommended_maintenance_action: z.string(),
  top_factors: z.array(topFactorSchema),
});

const processedSchema = z.discriminatedUnion('locomotive_model', [
  kz8aProcessedSchema,
  te33aProcessedSchema,
]);

// ──── Alert ────

const alertSchema = z.object({
  id: z.string(),
  locomotive_id: z.string(),
  locomotive_model: locoModelSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  component: z.string(),
  metric: z.string(),
  value: z.number(),
  threshold: z.number(),
  timestamp_utc: z.string(),
  acknowledged: z.boolean(),
});

// ──── Route ────

const routeSchema = z.object({
  locomotive_id: z.string(),
  route_id: z.string(),
  segment_id: z.string(),
  from: z.string(),
  to: z.string(),
  position_km: z.number(),
  totalKm: z.number(),
  planned_speed_limit_kmh: z.number(),
  schedule_deviation_min: z.number(),
  route_compliance_score: z.number(),
  delay_risk_score: z.number(),
  eta_to_checkpoint_min: z.number(),
});

// ──── Fleet entries ────

const fleetEntryBaseSchema = z.object({
  locomotive_id: z.string(),
  timestamp_utc: z.string(),
  health_index: z.number(),
  fault_code: z.string().nullable(),
  alert_count: z.number(),
  communication_status: communicationStatusSchema,
  brake_system_status: componentStatusSchema,
  availability_score: z.number(),
  downtime_risk_score: z.number(),
  maintenance_priority_score: z.number(),
  criticality_rank: z.number(),
  fleet_health_contribution: z.number(),
  operational_status_summary: z.string(),
});

const kz8aFleetSchema = fleetEntryBaseSchema.extend({
  locomotive_model: z.literal('KZ8A'),
  pantograph_status: componentStatusSchema,
  main_transformer_status: componentStatusSchema,
  traction_drive_status: componentStatusSchema,
});

const te33aFleetSchema = fleetEntryBaseSchema.extend({
  locomotive_model: z.literal('TE33A'),
  engine_status: componentStatusSchema,
  fuel_level_pct: z.number(),
  propulsion_system_status: componentStatusSchema,
  dynamic_brake_status: componentStatusSchema,
  fuel_readiness_score: z.number(),
});

const fleetEntrySchema = z.discriminatedUnion('locomotive_model', [
  kz8aFleetSchema,
  te33aFleetSchema,
]);

// ──── Dispatcher overlay ────

const dispatcherOverlaySchema = z.object({
  locomotive_id: z.string(),
  incident_priority_score: z.number(),
  mission_readiness: z.number(),
  operational_status_summary: z.string(),
});

// ──── Snapshot ────

const locomotiveSnapshotSchema = z.object({
  telemetry: telemetrySchema,
  processed: processedSchema,
  alerts: z.array(alertSchema),
  route: routeSchema.nullable(),
});

const snapshotPayloadSchema = z.object({
  role: z.string(),
  locomotives: z.array(locomotiveSnapshotSchema),
});

// ──── Top-level WS message ────

export const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('snapshot_init'), payload: snapshotPayloadSchema }),
  z.object({ type: z.literal('telemetry_update'), payload: telemetrySchema }),
  z.object({ type: z.literal('processed_update'), payload: processedSchema }),
  z.object({ type: z.literal('alert_created'), payload: alertSchema }),
  z.object({ type: z.literal('alert_resolved'), payload: z.object({ id: z.string(), locomotive_id: z.string() }) }),
  z.object({ type: z.literal('route_context_update'), payload: routeSchema }),
  z.object({ type: z.literal('dispatcher_overlay_update'), payload: dispatcherOverlaySchema }),
  z.object({ type: z.literal('fleet_summary_update'), payload: z.array(fleetEntrySchema) }),
  z.object({ type: z.literal('pong'), payload: z.null() }),
]);

export type ValidatedWSMessage = z.infer<typeof wsMessageSchema>;
