const configRepo = require('../models/configRepo');
const logger = require('../utils/logger');

/**
 * In-memory cache for thresholds and weights.
 * Refreshed periodically.
 */
let thresholdCache = {};   // { 'KZ8A': { metric: {warning, critical, direction} } }
let weightCache = {};      // { 'KZ8A': { factor: weight } }

async function refreshConfigCache() {
  try {
    const thresholds = await configRepo.getThresholds();
    const newCache = {};
    for (const t of thresholds) {
      if (!newCache[t.model_code]) newCache[t.model_code] = {};
      newCache[t.model_code][t.metric] = {
        warning: t.warning,
        critical: t.critical,
        direction: t.direction,
      };
    }
    thresholdCache = newCache;

    const weights = await configRepo.getWeights();
    const newWeights = {};
    for (const w of weights) {
      if (!newWeights[w.model_code]) newWeights[w.model_code] = {};
      newWeights[w.model_code][w.factor] = w.weight;
    }
    weightCache = newWeights;
  } catch (err) {
    logger.error('Failed to refresh config cache', { error: err.message });
  }
}

// Refresh every 30 seconds
setInterval(refreshConfigCache, 30000);

/**
 * Check metric against threshold.
 * Returns: 0 (ok), 1 (warning), 2 (critical)
 */
function checkThreshold(model, metric, value) {
  const cfg = thresholdCache[model]?.[metric];
  if (!cfg || typeof value !== 'number') return 0;

  if (cfg.direction === 'upper') {
    if (value >= cfg.critical) return 2;
    if (value >= cfg.warning) return 1;
  } else {
    // 'lower' — warning/critical are lower bounds
    if (value <= cfg.critical) return 2;
    if (value <= cfg.warning) return 1;
  }
  return 0;
}

function getWeight(model, factor) {
  return weightCache[model]?.[factor] || 0;
}

/**
 * Translate component status to a penalty severity.
 */
function statusPenalty(status) {
  if (status === 'fault') return 2;
  if (status === 'degraded') return 1;
  return 0;
}

// ==========================================================
// KZ8A Health
// ==========================================================
function calculateKZ8AHealth(normalized) {
  const factors = [];
  let totalPenalty = 0;

  const model = 'KZ8A';

  // Transformer thermal
  const txTempSev = checkThreshold(model, 'main_transformer_temp_c', normalized.main_transformer_temp_c);
  if (txTempSev > 0) {
    const w = getWeight(model, 'transformer_thermal');
    const penalty = txTempSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'transformer_temp_high',
      impact: penalty,
      detail: `Transformer temp ${normalized.main_transformer_temp_c}°C`,
    });
  }

  // Converter thermal
  const convTempSev = checkThreshold(model, 'traction_converter_temp_c', normalized.traction_converter_temp_c);
  if (convTempSev > 0) {
    const w = getWeight(model, 'converter_thermal');
    const penalty = convTempSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'converter_temp_high',
      impact: penalty,
      detail: `Converter temp ${normalized.traction_converter_temp_c}°C`,
    });
  }

  // Electrical supply
  const voltageSev = checkThreshold(model, 'catenary_voltage_kv', normalized.catenary_voltage_kv);
  if (voltageSev > 0) {
    const w = getWeight(model, 'electrical_supply');
    const penalty = voltageSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'voltage_drop',
      impact: penalty,
      detail: `Catenary voltage ${normalized.catenary_voltage_kv} kV`,
    });
  }

  // Brake pressure
  const brakeSev = checkThreshold(model, 'brake_system_pressure_bar', normalized.brake_system_pressure_bar);
  if (brakeSev > 0) {
    const w = getWeight(model, 'brake_pressure');
    const penalty = brakeSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'brake_pressure_low',
      impact: penalty,
      detail: `Brake pressure ${normalized.brake_system_pressure_bar} bar`,
    });
  }

  // Overload (transformer + converter)
  const txLoadSev = checkThreshold(model, 'main_transformer_load_pct', normalized.main_transformer_load_pct);
  const convLoadSev = checkThreshold(model, 'traction_converter_load_pct', normalized.traction_converter_load_pct);
  const maxLoadSev = Math.max(txLoadSev, convLoadSev);
  if (maxLoadSev > 0) {
    const w = getWeight(model, 'overload');
    const penalty = maxLoadSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'overload',
      impact: penalty,
      detail: `Transformer load ${normalized.main_transformer_load_pct}%, converter load ${normalized.traction_converter_load_pct}%`,
    });
  }

  // Fault code
  if (normalized.fault_code) {
    const w = getWeight(model, 'fault_code');
    totalPenalty += w;
    factors.push({
      name: 'active_fault',
      impact: w,
      detail: `Fault: ${normalized.fault_code}`,
    });
  }

  // Communication
  if (normalized.communication_status !== 'online') {
    const w = getWeight(model, 'communication_loss');
    const penalty = normalized.communication_status === 'offline' ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'communication_degraded',
      impact: penalty,
      detail: `Communication: ${normalized.communication_status}`,
    });
  }

  // Component degradation
  const components = [
    normalized.pantograph_status,
    normalized.main_transformer_status,
    normalized.traction_drive_status,
    normalized.traction_converter_status,
    normalized.regenerative_braking_status,
    normalized.control_system_status,
  ];
  const compPenalties = components.map(statusPenalty);
  const maxCompSev = Math.max(...compPenalties);
  if (maxCompSev > 0) {
    const w = getWeight(model, 'component_degradation');
    const penalty = maxCompSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'component_status_issue',
      impact: penalty,
      detail: `Worst component status severity: ${maxCompSev === 2 ? 'fault' : 'degraded'}`,
    });
  }

  // Clamp
  const healthIndex = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
  const healthStatus = healthIndex >= 85 ? 'Good' : healthIndex >= 60 ? 'Warning' : 'Critical';

  // Sort factors by impact desc
  factors.sort((a, b) => b.impact - a.impact);

  // Derived sub-scores (inverted from penalties)
  const txTempPenalty = txTempSev === 2 ? 1 : txTempSev === 1 ? 0.5 : 0;
  const convTempPenalty = convTempSev === 2 ? 1 : convTempSev === 1 ? 0.5 : 0;
  const voltagePenalty = voltageSev === 2 ? 1 : voltageSev === 1 ? 0.5 : 0;
  const brakePenalty = brakeSev === 2 ? 1 : brakeSev === 1 ? 0.5 : 0;

  return {
    locomotive_model: 'KZ8A',
    locomotive_id: normalized.locomotive_id,
    timestamp_utc: normalized.timestamp_utc,

    health_index: healthIndex,
    health_status: healthStatus,

    electrical_supply_risk: Math.round(voltagePenalty * 100) / 100,
    transformer_health_score: Math.round((1 - txTempPenalty * 0.5 - (statusPenalty(normalized.main_transformer_status) / 4)) * 100),
    transformer_thermal_risk: Math.round(txTempPenalty * 100) / 100,
    traction_drive_health_score: Math.round((1 - statusPenalty(normalized.traction_drive_status) / 4) * 100),
    converter_thermal_risk: Math.round(convTempPenalty * 100) / 100,
    regen_efficiency_score: normalized.regenerative_braking_status === 'ok' ? 90 : normalized.regenerative_braking_status === 'degraded' ? 60 : 30,
    brake_risk: Math.round(brakePenalty * 100) / 100,
    energy_efficiency_score: Math.max(0, Math.round(100 - (normalized.energy_consumption_kw / 50))),
    fault_severity_score: normalized.fault_code ? 80 : 0,
    maintenance_priority_score: healthIndex <= 60 ? 90 : healthIndex <= 85 ? 50 : 10,

    root_cause_candidates: factors.slice(0, 3).map(f => ({
      component: f.name,
      probability: Math.min(1, f.impact / 20),
      description: f.detail,
    })),
    recommended_action: getKZ8ARecommendation(healthStatus, factors),
    recommended_maintenance_action: healthIndex <= 60 ? 'Срочная диагностика: ' + (factors[0]?.name || 'проверка') : healthIndex <= 85 ? 'Плановая проверка: ' + (factors[0]?.name || 'мониторинг') : 'Штатная эксплуатация',
    top_factors: factors.slice(0, 5),
  };
}

function getKZ8ARecommendation(healthStatus, factors) {
  if (healthStatus === 'Critical') {
    if (factors.find(f => f.name === 'transformer_temp_high')) return 'Снизить нагрузку, проверить охлаждение трансформатора';
    if (factors.find(f => f.name === 'brake_pressure_low')) return 'Проверить тормозную систему, снизить скорость';
    return 'Снизить нагрузку и подготовить замену';
  }
  if (healthStatus === 'Warning') {
    if (factors.find(f => f.name === 'transformer_temp_high')) return 'Снизить нагрузку и наблюдать тренд';
    if (factors.find(f => f.name === 'brake_pressure_low')) return 'Контроль давления тормозной системы';
    return 'Продолжить движение с мониторингом параметров';
  }
  return 'Штатный режим';
}

// ==========================================================
// TE33A Health
// ==========================================================
function calculateTE33AHealth(normalized) {
  const factors = [];
  let totalPenalty = 0;

  const model = 'TE33A';

  // Engine overload
  const loadSev = checkThreshold(model, 'engine_load_pct', normalized.engine_load_pct);
  if (loadSev > 0) {
    const w = getWeight(model, 'engine_overload');
    const penalty = loadSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'engine_overload',
      impact: penalty,
      detail: `Engine load ${normalized.engine_load_pct}%`,
    });
  }

  // Engine RPM
  const rpmSev = checkThreshold(model, 'engine_rpm', normalized.engine_rpm);
  if (rpmSev > 0) {
    const w = getWeight(model, 'engine_thermal');
    const penalty = rpmSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'engine_rpm_high',
      impact: penalty,
      detail: `Engine RPM ${normalized.engine_rpm}`,
    });
  }

  // Fuel level low
  const fuelSev = checkThreshold(model, 'fuel_level_pct', normalized.fuel_level_pct);
  if (fuelSev > 0) {
    const w = getWeight(model, 'fuel_low');
    const penalty = fuelSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'fuel_level_low',
      impact: penalty,
      detail: `Fuel level ${normalized.fuel_level_pct}%`,
    });
  }

  // Fuel consumption anomaly
  const fuelConsSev = checkThreshold(model, 'fuel_consumption_lph', normalized.fuel_consumption_lph);
  if (fuelConsSev > 0) {
    const w = getWeight(model, 'fuel_anomaly');
    const penalty = fuelConsSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'fuel_consumption_high',
      impact: penalty,
      detail: `Fuel consumption ${normalized.fuel_consumption_lph} l/h`,
    });
  }

  // Brake pressure
  const brakeSev = checkThreshold(model, 'brake_system_pressure_bar', normalized.brake_system_pressure_bar);
  if (brakeSev > 0) {
    const w = getWeight(model, 'brake_pressure');
    const penalty = brakeSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'brake_pressure_low',
      impact: penalty,
      detail: `Brake pressure ${normalized.brake_system_pressure_bar} bar`,
    });
  }

  // Fault code
  if (normalized.fault_code) {
    const w = getWeight(model, 'fault_code');
    totalPenalty += w;
    factors.push({
      name: 'active_fault',
      impact: w,
      detail: `Fault: ${normalized.fault_code}`,
    });
  }

  // Communication
  if (normalized.communication_status !== 'online') {
    const w = getWeight(model, 'communication_loss');
    const penalty = normalized.communication_status === 'offline' ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'communication_degraded',
      impact: penalty,
      detail: `Communication: ${normalized.communication_status}`,
    });
  }

  // Component degradation
  const components = [
    normalized.engine_status,
    normalized.propulsion_system_status,
    normalized.dynamic_brake_status,
    normalized.compressor_status,
    normalized.auxiliaries_status,
    normalized.control_system_status,
  ];
  const compPenalties = components.map(statusPenalty);
  const maxCompSev = Math.max(...compPenalties);
  if (maxCompSev > 0) {
    const w = getWeight(model, 'component_degradation');
    const penalty = maxCompSev === 2 ? w : w * 0.5;
    totalPenalty += penalty;
    factors.push({
      name: 'component_status_issue',
      impact: penalty,
      detail: `Worst component severity: ${maxCompSev === 2 ? 'fault' : 'degraded'}`,
    });
  }

  const healthIndex = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
  const healthStatus = healthIndex >= 85 ? 'Good' : healthIndex >= 60 ? 'Warning' : 'Critical';

  factors.sort((a, b) => b.impact - a.impact);

  const loadPenalty = loadSev === 2 ? 1 : loadSev === 1 ? 0.5 : 0;
  const brakePenalty = brakeSev === 2 ? 1 : brakeSev === 1 ? 0.5 : 0;
  const fuelPenalty = fuelSev === 2 ? 1 : fuelSev === 1 ? 0.5 : 0;

  // Estimated remaining fuel hours
  const fuelRemainingEta = normalized.fuel_consumption_lph > 0
    ? Math.round((normalized.fuel_level_pct / 100 * 5000) / normalized.fuel_consumption_lph * 10) / 10  // assume 5000L tank
    : 999;

  return {
    locomotive_model: 'TE33A',
    locomotive_id: normalized.locomotive_id,
    timestamp_utc: normalized.timestamp_utc,

    health_index: healthIndex,
    health_status: healthStatus,

    engine_health_score: Math.round((1 - loadPenalty * 0.5 - statusPenalty(normalized.engine_status) / 4) * 100),
    engine_overload_risk: Math.round(loadPenalty * 100) / 100,
    fuel_efficiency_score: Math.max(0, Math.round(100 - normalized.fuel_consumption_lph / 5)),
    fuel_anomaly_score: Math.round(fuelPenalty * 100) / 100,
    fuel_remaining_eta_h: fuelRemainingEta,
    propulsion_health_score: Math.round((1 - statusPenalty(normalized.propulsion_system_status) / 4) * 100),
    dynamic_brake_availability_score: normalized.dynamic_brake_status === 'ok' ? 100 : normalized.dynamic_brake_status === 'degraded' ? 60 : 0,
    brake_risk: Math.round(brakePenalty * 100) / 100,
    compressor_readiness_score: normalized.compressor_status === 'ok' ? 100 : normalized.compressor_status === 'degraded' ? 60 : 0,
    maintenance_alert_score: healthIndex <= 60 ? 90 : healthIndex <= 85 ? 50 : 10,
    fault_severity_score: normalized.fault_code ? 80 : 0,
    maintenance_priority_score: healthIndex <= 60 ? 90 : healthIndex <= 85 ? 50 : 10,

    root_cause_candidates: factors.slice(0, 3).map(f => ({
      component: f.name,
      probability: Math.min(1, f.impact / 20),
      description: f.detail,
    })),
    recommended_action: getTE33ARecommendation(healthStatus, factors),
    recommended_maintenance_action: healthIndex <= 60 ? 'Срочная диагностика двигателя' : healthIndex <= 85 ? 'Плановая проверка: ' + (factors[0]?.name || 'мониторинг') : 'Штатная эксплуатация',
    top_factors: factors.slice(0, 5),
  };
}

function getTE33ARecommendation(healthStatus, factors) {
  if (healthStatus === 'Critical') {
    if (factors.find(f => f.name === 'engine_overload')) return 'Снизить нагрузку двигателя немедленно';
    if (factors.find(f => f.name === 'fuel_level_low')) return 'Дозаправка необходима, направить к ближайшей станции';
    if (factors.find(f => f.name === 'brake_pressure_low')) return 'Проверить тормозную систему';
    return 'Снизить нагрузку и подготовить замену';
  }
  if (healthStatus === 'Warning') {
    if (factors.find(f => f.name === 'engine_overload')) return 'Контроль нагрузки двигателя';
    if (factors.find(f => f.name === 'fuel_level_low')) return 'Запланировать дозаправку';
    return 'Продолжить движение с мониторингом';
  }
  return 'Штатный режим';
}

/**
 * Main entry: calculate processed metrics based on model type.
 */
function calculateHealth(normalized) {
  if (normalized.locomotive_model === 'KZ8A') return calculateKZ8AHealth(normalized);
  if (normalized.locomotive_model === 'TE33A') return calculateTE33AHealth(normalized);
  throw new Error(`Unknown model: ${normalized.locomotive_model}`);
}

module.exports = { calculateHealth, refreshConfigCache, getThresholdCache: () => thresholdCache };
