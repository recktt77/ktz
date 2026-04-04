const { v4: uuidv4 } = require('uuid');
const configRepo = require('../models/configRepo');
const logger = require('../utils/logger');

/**
 * In-memory active alerts per locomotive.
 * Map<locomotiveId, Map<alertKey, AlertItem>>
 */
const activeAlerts = new Map();

/**
 * Check normalized telemetry against thresholds and manage alerts.
 * Returns { created: AlertItem[], resolved: { id, locomotive_id }[] }
 */
async function evaluateAlerts(normalized, thresholds) {
  const locoId = normalized.locomotive_id;
  const model = normalized.locomotive_model;

  if (!activeAlerts.has(locoId)) {
    activeAlerts.set(locoId, new Map());
  }
  const locoAlerts = activeAlerts.get(locoId);

  const created = [];
  const resolved = [];
  const seenKeys = new Set();

  // Define metrics to check
  const metricsToCheck = getMetricsForModel(model, normalized);

  for (const check of metricsToCheck) {
    const key = `${locoId}:${check.metric}`;
    seenKeys.add(key);

    const thCfg = thresholds?.[check.metric];
    if (!thCfg || typeof check.value !== 'number') continue;

    let severity = null;
    let threshold = null;

    if (thCfg.direction === 'upper') {
      if (check.value >= thCfg.critical) { severity = 'critical'; threshold = thCfg.critical; }
      else if (check.value >= thCfg.warning) { severity = 'warning'; threshold = thCfg.warning; }
    } else {
      if (check.value <= thCfg.critical) { severity = 'critical'; threshold = thCfg.critical; }
      else if (check.value <= thCfg.warning) { severity = 'warning'; threshold = thCfg.warning; }
    }

    if (severity) {
      // Alert should exist
      if (!locoAlerts.has(key)) {
        const alert = {
          id: uuidv4(),
          locomotive_id: locoId,
          locomotive_model: model,
          severity,
          title: check.title,
          message: `${check.title}: ${check.value} ${check.unit || ''}`,
          component: check.component,
          metric: check.metric,
          value: check.value,
          threshold,
          timestamp_utc: normalized.timestamp_utc,
          acknowledged: false,
        };
        locoAlerts.set(key, alert);
        created.push(alert);

        // Persist
        try {
          await configRepo.insertAlert({
            ...alert,
            model_code: model,
          });
        } catch (err) {
          logger.error('Failed to persist alert', { error: err.message });
        }
      }
    } else {
      // Metric back to normal — resolve if exists
      if (locoAlerts.has(key)) {
        const alert = locoAlerts.get(key);
        locoAlerts.delete(key);
        resolved.push({ id: alert.id, locomotive_id: locoId });

        try {
          await configRepo.resolveAlert(alert.id);
        } catch (err) {
          logger.error('Failed to resolve alert', { error: err.message });
        }
      }
    }
  }

  return { created, resolved };
}

function getMetricsForModel(model, n) {
  const common = [
    { metric: 'speed_kmh', value: n.speed_kmh, title: 'Превышение скорости', component: 'speed', unit: 'km/h' },
    { metric: 'brake_system_pressure_bar', value: n.brake_system_pressure_bar, title: 'Низкое давление тормозов', component: 'brake_system', unit: 'bar' },
  ];

  if (model === 'KZ8A') {
    return [
      ...common,
      { metric: 'main_transformer_temp_c', value: n.main_transformer_temp_c, title: 'Перегрев трансформатора', component: 'main_transformer', unit: '°C' },
      { metric: 'traction_converter_temp_c', value: n.traction_converter_temp_c, title: 'Перегрев преобразователя', component: 'traction_converter', unit: '°C' },
      { metric: 'catenary_voltage_kv', value: n.catenary_voltage_kv, title: 'Просадка напряжения КС', component: 'electrical_supply', unit: 'kV' },
      { metric: 'main_transformer_load_pct', value: n.main_transformer_load_pct, title: 'Перегрузка трансформатора', component: 'main_transformer', unit: '%' },
      { metric: 'traction_converter_load_pct', value: n.traction_converter_load_pct, title: 'Перегрузка преобразователя', component: 'traction_converter', unit: '%' },
    ];
  }

  // TE33A
  return [
    ...common,
    { metric: 'engine_load_pct', value: n.engine_load_pct, title: 'Перегрузка двигателя', component: 'engine', unit: '%' },
    { metric: 'engine_rpm', value: n.engine_rpm, title: 'Высокие обороты двигателя', component: 'engine', unit: 'rpm' },
    { metric: 'fuel_level_pct', value: n.fuel_level_pct, title: 'Низкий уровень топлива', component: 'fuel_system', unit: '%' },
    { metric: 'fuel_consumption_lph', value: n.fuel_consumption_lph, title: 'Аномальный расход топлива', component: 'fuel_system', unit: 'l/h' },
  ];
}

function getActiveAlertsForLoco(locomotiveId) {
  const locoAlerts = activeAlerts.get(locomotiveId);
  if (!locoAlerts) return [];
  return Array.from(locoAlerts.values());
}

function getAllActiveAlerts() {
  const all = [];
  for (const locoAlerts of activeAlerts.values()) {
    for (const alert of locoAlerts.values()) {
      all.push(alert);
    }
  }
  return all;
}

module.exports = { evaluateAlerts, getActiveAlertsForLoco, getAllActiveAlerts };
