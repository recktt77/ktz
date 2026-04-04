/**
 * Build role-specific view payloads from normalized telemetry + processed data.
 */

function buildDriverView(normalized, processed) {
  const tractionMode = getTractionMode(normalized);
  const brakeStatus = getBrakeStatus(normalized);

  return {
    role: 'driver',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    health_index: processed.health_index,
    health_status: processed.health_status,
    speed_kmh: normalized.speed_kmh,
    traction_mode: tractionMode,
    brake_status: brakeStatus,
    main_alert: processed.top_factors.length > 0
      ? processed.top_factors[0].detail
      : 'Всё в норме',
    recommended_action: processed.recommended_action,
  };
}

function buildDispatcherView(normalized, processed, route) {
  return {
    role: 'dispatcher',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    health_index: processed.health_index,
    health_status: processed.health_status,
    speed_kmh: normalized.speed_kmh,
    position_km: normalized.position_km,
    track_segment_id: normalized.track_segment_id,
    communication_status: normalized.communication_status,
    fault_code: normalized.fault_code,
    alert_count: processed.top_factors.length,
    incident_priority_score: processed.maintenance_priority_score,
    mission_readiness: processed.health_index >= 60 ? 1.0 : 0.5,
    operational_status_summary: getOperationalSummary(processed),
    route: route || null,
  };
}

function buildEngineerView(normalized, processed) {
  return {
    role: 'engineer',
    locomotiveId: normalized.locomotive_id,
    locomotive_model: normalized.locomotive_model,
    health_index: processed.health_index,
    health_status: processed.health_status,
    // Full normalized telemetry for technical details
    telemetry: normalized,
    // Full processed analytics
    processed: processed,
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
