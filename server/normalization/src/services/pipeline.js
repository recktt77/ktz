const { normalize } = require('./adapters');
const { isDuplicate } = require('./smoothing');
const { calculateHealth } = require('./healthCalculator');
const { evaluateAlerts, getActiveAlertsForLoco } = require('./alertService');
const { buildDriverView, buildDispatcherView, buildEngineerView, buildSupervisorFleetEntry } = require('./roleViewBuilder');
const normalizedRepo = require('../models/normalizedRepo');
const healthRepo = require('../models/healthRepo');
const configRepo = require('../models/configRepo');
const rabbitConsumer = require('./rabbitConsumer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * In-memory state per locomotive for WebSocket push.
 * Map<locomotiveId, { normalized, processed, alerts, fleetEntry }>
 */
const locomotiveState = new Map();

/**
 * Threshold cache for alert evaluation.
 */
let thresholdCache = {};

async function refreshThresholdCache() {
  try {
    const thresholds = await configRepo.getThresholds();
    const cache = {};
    for (const t of thresholds) {
      if (!cache[t.model_code]) cache[t.model_code] = {};
      cache[t.model_code][t.metric] = {
        warning: t.warning,
        critical: t.critical,
        direction: t.direction,
      };
    }
    thresholdCache = cache;
  } catch (err) {
    logger.error('Failed to refresh threshold cache', { error: err.message });
  }
}

// Counter for processed analytics (every N-th tick)
const processedCounters = new Map();
const PROCESSED_INTERVAL = 8; // Every 8 telemetry messages

// Counter for fleet summary
let fleetSummaryCounter = 0;
const FLEET_SUMMARY_INTERVAL = 15;

/**
 * Main processing handler called for each raw telemetry event from RabbitMQ.
 */
async function processRawTelemetry(event, wsBroadcast) {
  const raw = event.payload;
  if (!raw || !raw.locomotive_id || !raw.locomotive_model) {
    logger.warn('Invalid raw telemetry event, skipping');
    return;
  }

  // Dedup
  if (isDuplicate(raw.locomotive_id, raw.timestamp_utc)) {
    logger.debug('Duplicate telemetry, skipping', { locomotive_id: raw.locomotive_id });
    return;
  }

  try {
    // 1. Normalize (adapter + smoothing)
    const normalized = normalize(raw);

    // 2. Store normalized telemetry
    await normalizedRepo.insert(
      normalized.locomotive_id,
      normalized.locomotive_model,
      normalized.timestamp_utc,
      normalized
    );

    // 3. Push telemetry_update via WebSocket (every tick, ~1s)
    wsBroadcast('telemetry_update', normalized);

    // 4. Calculate processed metrics periodically
    const locoId = normalized.locomotive_id;
    let count = (processedCounters.get(locoId) || 0) + 1;
    processedCounters.set(locoId, count);

    let processed = locomotiveState.get(locoId)?.processed;

    if (count % PROCESSED_INTERVAL === 1 || !processed) {
      // Calculate health + processed metrics
      processed = calculateHealth(normalized);

      // Store derived metrics
      await healthRepo.insertDerived(
        processed.locomotive_id,
        processed.locomotive_model,
        processed.timestamp_utc,
        processed.health_index,
        processed.health_status,
        processed
      );

      // Store health snapshot
      await healthRepo.insertSnapshot(
        processed.locomotive_id,
        processed.timestamp_utc,
        processed.health_index,
        processed.health_status,
        processed.top_factors
      );

      // Push processed_update via WebSocket
      wsBroadcast('processed_update', processed);

      // Publish events
      rabbitConsumer.publish(config.rabbitmq.publishKeys.healthUpdated, {
        locomotive_id: processed.locomotive_id,
        health_index: processed.health_index,
        health_status: processed.health_status,
        timestamp_utc: processed.timestamp_utc,
      });
    }

    // 5. Evaluate alerts
    const modelThresholds = thresholdCache[normalized.locomotive_model] || {};
    const { created, resolved } = await evaluateAlerts(normalized, modelThresholds);

    for (const alert of created) {
      wsBroadcast('alert_created', alert);
    }
    for (const r of resolved) {
      wsBroadcast('alert_resolved', r);
    }

    // 6. Update in-memory state
    const alerts = getActiveAlertsForLoco(locoId);
    const fleetEntry = buildSupervisorFleetEntry(normalized, processed || { health_index: 100, health_status: 'Good', top_factors: [], maintenance_priority_score: 10 });

    locomotiveState.set(locoId, {
      normalized,
      processed: processed || locomotiveState.get(locoId)?.processed,
      alerts,
      fleetEntry,
    });

    // 7. Fleet summary broadcast (every N ticks globally)
    fleetSummaryCounter++;
    if (fleetSummaryCounter % FLEET_SUMMARY_INTERVAL === 0) {
      const fleet = buildFleetSummary();
      wsBroadcast('fleet_summary_update', fleet);
    }

  } catch (err) {
    logger.error('Pipeline processing error', {
      error: err.message,
      locomotive_id: raw.locomotive_id,
    });
  }
}

/**
 * Build fleet summary for supervisor from in-memory state.
 */
function buildFleetSummary() {
  const entries = [];
  for (const [, state] of locomotiveState) {
    if (state.fleetEntry) {
      entries.push(state.fleetEntry);
    }
  }

  // Sort by health_index ascending (worst first), assign criticality_rank
  entries.sort((a, b) => a.health_index - b.health_index);
  const totalHealth = entries.reduce((s, e) => s + e.health_index, 0) || 1;

  entries.forEach((e, i) => {
    e.criticality_rank = i + 1;
    e.fleet_health_contribution = Math.round((e.health_index / totalHealth) * 100) / 100;
  });

  return entries;
}

/**
 * Get full current snapshot for a locomotive (for snapshot_init).
 */
function getLocomotiveSnapshot(locomotiveId) {
  return locomotiveState.get(locomotiveId) || null;
}

/**
 * Get all tracked locomotive IDs.
 */
function getTrackedLocomotiveIds() {
  return Array.from(locomotiveState.keys());
}

/**
 * Build snapshot_init payload for a role + set of locomotive IDs.
 */
function buildSnapshotInit(role, locomotiveIds) {
  const locomotives = [];

  const ids = locomotiveIds.length > 0
    ? locomotiveIds
    : getTrackedLocomotiveIds();

  for (const id of ids) {
    const state = locomotiveState.get(id);
    if (!state || !state.normalized || !state.processed) continue;

    locomotives.push({
      telemetry: state.normalized,
      processed: state.processed,
      alerts: state.alerts || [],
      route: null, // Route comes from map service
    });
  }

  return {
    role,
    locomotives,
  };
}

module.exports = {
  processRawTelemetry,
  getLocomotiveSnapshot,
  getTrackedLocomotiveIds,
  buildSnapshotInit,
  buildFleetSummary,
  refreshThresholdCache,
  locomotiveState,
};
