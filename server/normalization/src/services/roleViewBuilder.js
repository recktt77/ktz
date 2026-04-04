/**
 * Build role-specific view payloads from normalized telemetry + processed data.
 */

const { getActiveAlertsForLoco } = require('./alertService');

function buildDriverView(normalized, processed) {
  const tractionMode = getTractionMode(normalized);
  const brakeStatus = getBrakeStatus(normalized);

  const base = {
    role: 'driver',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    timestamp_utc: normalized.timestamp_utc,
    health_index: processed.health_index,
    health_status: processed.health_status,
    speed_kmh: normalized.speed_kmh,
    traction_mode: tractionMode,
    brake_status: brakeStatus,

    // Detailed braking parameters
    brake_system_pressure_bar: normalized.brake_system_pressure_bar,
    brake_system_status: normalized.brake_system_status,

    main_alert: processed.top_factors.length > 0
      ? processed.top_factors[0].detail
      : 'Всё в норме',
    recommended_action: processed.recommended_action,
  };

  // Model-specific main parameters
  if (normalized.locomotive_model === 'KZ8A') {
    base.catenary_voltage_kv = normalized.catenary_voltage_kv;
    base.main_transformer_temp_c = normalized.main_transformer_temp_c;
    base.main_transformer_load_pct = normalized.main_transformer_load_pct;
    base.traction_converter_temp_c = normalized.traction_converter_temp_c;
    base.traction_converter_load_pct = normalized.traction_converter_load_pct;
    base.tractive_effort_kn = normalized.tractive_effort_kn;
    base.regenerative_braking_power_kw = normalized.regenerative_braking_power_kw;
    base.energy_consumption_kw = normalized.energy_consumption_kw;
    base.pantograph_status = normalized.pantograph_status;
  } else {
    // TE33A
    base.engine_rpm = normalized.engine_rpm;
    base.engine_load_pct = normalized.engine_load_pct;
    base.fuel_level_pct = normalized.fuel_level_pct;
    base.fuel_consumption_lph = normalized.fuel_consumption_lph;
    base.fuel_remaining_eta_h = processed.fuel_remaining_eta_h;
    base.dynamic_brake_status = normalized.dynamic_brake_status;
    base.engine_status = normalized.engine_status;
  }

  return base;
}

function buildDispatcherView(normalized, processed, route) {
  const alerts = getActiveAlertsForLoco(normalized.locomotive_id);

  return {
    role: 'dispatcher',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    timestamp_utc: normalized.timestamp_utc,
    health_index: processed.health_index,
    health_status: processed.health_status,
    speed_kmh: normalized.speed_kmh,
    position_km: normalized.position_km,
    track_segment_id: normalized.track_segment_id,
    communication_status: normalized.communication_status,
    fault_code: normalized.fault_code,
    alert_count: alerts.length,
    incident_priority_score: processed.maintenance_priority_score,
    mission_readiness: processed.health_index >= 60 ? 1.0 : 0.5,
    operational_status_summary: getOperationalSummary(processed),

    // Recent alerts as event timeline
    recent_events: alerts.slice(0, 10).map(a => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      message: a.message,
      timestamp_utc: a.timestamp_utc,
    })),

    // Risk breakdown from top factors
    risks: processed.top_factors.slice(0, 5).map(f => ({
      component: f.name,
      impact: f.impact,
      detail: f.detail,
    })),

    route: route || null,
  };
}

function buildEngineerView(normalized, processed) {
  const alerts = getActiveAlertsForLoco(normalized.locomotive_id);

  return {
    role: 'engineer',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    timestamp_utc: normalized.timestamp_utc,
    health_index: processed.health_index,
    health_status: processed.health_status,

    // Full normalized telemetry for technical details
    telemetry: normalized,
    // Full processed analytics
    processed: processed,

    // Root cause analysis
    root_cause_candidates: processed.root_cause_candidates || [],
    recommended_maintenance_action: processed.recommended_maintenance_action,

    // Active alerts with full detail
    active_alerts: alerts,

    // Top degradation factors
    top_factors: processed.top_factors,
  };
}

function buildSupervisorFleetEntry(normalized, processed) {
  const base = {
    locomotive_id: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    timestamp_utc: normalized.timestamp_utc,
    health_index: processed.health_index,
    fault_code: normalized.fault_code,
    alert_count: processed.top_factors.length,
    communication_status: normalized.communication_status,
    brake_system_status: normalized.brake_system_status,
    availability_score: processed.health_index >= 85 ? 100 : processed.health_index >= 60 ? 70 : 30,
    downtime_risk_score: processed.health_index <= 60 ? 80 : processed.health_index <= 85 ? 40 : 5,
    maintenance_priority_score: processed.maintenance_priority_score,
    criticality_rank: 0, // Set externally when building fleet
    fleet_health_contribution: 0, // Set externally
    operational_status_summary: getOperationalSummary(processed),
  };

  // Add model-specific fields
  if (normalized.locomotive_model === 'KZ8A') {
    base.pantograph_status = normalized.pantograph_status;
    base.main_transformer_status = normalized.main_transformer_status;
    base.traction_drive_status = normalized.traction_drive_status;
  } else {
    base.engine_status = normalized.engine_status;
    base.fuel_level_pct = normalized.fuel_level_pct;
    base.propulsion_system_status = normalized.propulsion_system_status;
    base.dynamic_brake_status = normalized.dynamic_brake_status;
    base.fuel_readiness_score = normalized.fuel_level_pct > 25 ? 100 : normalized.fuel_level_pct > 15 ? 60 : 20;
  }

  return base;
}

// Helpers
function getTractionMode(normalized) {
  if (normalized.locomotive_model === 'KZ8A') {
    if (normalized.regenerative_braking_power_kw > 0) return 'REGENERATIVE_BRAKING';
    if (normalized.tractive_effort_kn > 0) return 'TRACTION';
    return 'IDLE';
  }
  // TE33A
  if (normalized.engine_load_pct > 5) return 'TRACTION';
  return 'IDLE';
}

function getBrakeStatus(normalized) {
  if (normalized.brake_system_status === 'fault') return 'FAULT';
  if (normalized.brake_system_pressure_bar < 3.0) return 'LOW_PRESSURE';
  if (normalized.brake_system_status === 'degraded') return 'DEGRADED';
  return 'OK';
}

function getOperationalSummary(processed) {
  if (processed.health_status === 'Critical') return 'Требуется вмешательство';
  if (processed.health_status === 'Warning') return 'Мониторинг';
  return 'В норме';
}

module.exports = {
  buildDriverView,
  buildDispatcherView,
  buildEngineerView,
  buildSupervisorFleetEntry,
};
