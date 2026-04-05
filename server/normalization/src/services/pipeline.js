const { normalize } = require('./adapters');
const { isDuplicate } = require('./smoothing');
const { calculateHealth, getThresholdCache } = require('./healthCalculator');
const { evaluateAlerts, getActiveAlertsForLoco } = require('./alertService');
const { buildDriverView, buildDispatcherView, buildEngineerView, buildSupervisorFleetEntry } = require('./roleViewBuilder');
const normalizedRepo = require('../models/normalizedRepo');
const healthRepo = require('../models/healthRepo');
const rabbitConsumer = require('./rabbitConsumer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * In-memory state per locomotive for WebSocket push.
 * Map<locomotiveId, { normalized, processed, alerts, fleetEntry }>
 */
const locomotiveState = new Map();

// Threshold cache is managed by healthCalculator.js (refreshed every 30s)
// Use getThresholdCache() to access the latest thresholds

// Counter for processed analytics (every N-th tick)
const processedCounters = new Map();
const PROCESSED_INTERVAL = 8; // Every 8 telemetry messages

// Counter for fleet summary
let fleetSummaryCounter = 0;
const FLEET_SUMMARY_INTERVAL = 15;

// Route context update interval
const ROUTE_UPDATE_INTERVAL = 3; // Every 3 ticks (~3s)
const routeCounters = new Map();

/**
 * In-memory route assignments for simulated locomotives.
 * In production this would come from a dispatch/scheduling service.
 */
const routeAssignments = {
  'KTZ-4021': {
    route_id: 'R-AST-ALM-001',
    segment_id: 'SEG-AST-ALM',
    from: 'Astana',
    to: 'Almaty',
    totalKm: 1320,
    position_km: 0,
    dir: 1, // 1 = forward, -1 = reverse
  },
  'KTZ-7015': {
    route_id: 'R-KRG-AST-005',
    segment_id: 'SEG-AST-KRG',
    from: 'Karaganda',
    to: 'Astana',
    totalKm: 230,
    position_km: 0,
    dir: 1,
  },
};

/**
 * Advance route position based on current speed.
 * Returns updated route_context_update payload or null if no assignment.
 */
function advanceRoutePosition(locoId, speedKmh, intervalSec) {
  const ra = routeAssignments[locoId];
  if (!ra) return null;

  // distance = speed * time (convert 1s interval to hours)
  const distanceKm = (speedKmh || 0) * (intervalSec / 3600);
  ra.position_km += distanceKm * ra.dir;

  // Bounce at endpoints
  if (ra.position_km >= ra.totalKm * 0.97) {
    ra.position_km = ra.totalKm * 0.97;
    ra.dir = -1;
  }
  if (ra.position_km <= ra.totalKm * 0.03) {
    ra.position_km = ra.totalKm * 0.03;
    ra.dir = 1;
  }

  const remainKm = ra.dir === 1
    ? ra.totalKm - ra.position_km
    : ra.position_km;
  const avgSpeed = Math.max(speedKmh || 60, 30);

  return {
    locomotive_id: locoId,
    route_id: ra.route_id,
    segment_id: ra.segment_id,
    from: ra.from,
    to: ra.to,
    position_km: Math.round(ra.position_km * 10) / 10,
    totalKm: ra.totalKm,
    planned_speed_limit_kmh: 100,
    schedule_deviation_min: Math.round((-2 + Math.random() * 4) * 10) / 10,
    route_compliance_score: 85 + Math.floor(Math.random() * 12),
    delay_risk_score: 10 + Math.floor(Math.random() * 15),
    eta_to_checkpoint_min: Math.max(3, Math.round(remainKm / avgSpeed * 60)),
  };
}

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
    const modelThresholds = getThresholdCache()[normalized.locomotive_model] || {};
    const { created, resolved } = await evaluateAlerts(normalized, modelThresholds);

    for (const alert of created) {
      wsBroadcast('alert_created', alert);

      // Publish critical alerts to RabbitMQ for AI-Caller
      if (alert.severity === 'critical') {
        rabbitConsumer.publish(config.rabbitmq.publishKeys.alertCriticalCreated, {
          alert_id: alert.id,
          locomotive_id: alert.locomotive_id,
          locomotive_model: alert.locomotive_model,
          severity: alert.severity,
          metric: alert.metric,
          component: alert.component,
          value: alert.value,
          threshold: alert.threshold,
          title: alert.title,
          timestamp: alert.timestamp_utc,
        });
      }
    }
    for (const r of resolved) {
      wsBroadcast('alert_resolved', r);

      // Notify AI-Caller to cancel retries
      rabbitConsumer.publish(config.rabbitmq.publishKeys.alertCriticalResolved, {
        alert_id: r.id,
        locomotive_id: r.locomotive_id,
      });
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

    // 8. Route context update (every N ticks per locomotive)
    let routeCount = (routeCounters.get(locoId) || 0) + 1;
    routeCounters.set(locoId, routeCount);

    const routeCtx = advanceRoutePosition(locoId, normalized.speed_kmh, 1);
    if (routeCtx && routeCount % ROUTE_UPDATE_INTERVAL === 0) {
      wsBroadcast('route_context_update', routeCtx);

      // Update in-memory state with route
      const curState = locomotiveState.get(locoId);
      if (curState) {
        curState.route = routeCtx;
      }
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
      route: state.route || null,
    });
  }

  return {
    role,
    locomotives,
  };
}

/**
 * Recover in-memory locomotive state from DB on startup.
 * Loads the latest normalized + health records per locomotive.
 */
async function loadStateFromDb() {
  try {
    const locos = await normalizedRepo.findDistinctLocomotives(60);
    for (const row of locos) {
      const locoId = row.locomotive_id;
      const latest = await normalizedRepo.findLatest(locoId);
      if (!latest) continue;

      const normalized = latest.metrics || latest;
      normalized.locomotive_id = normalized.locomotive_id || locoId;

      const processed = calculateHealth(normalized);
      const fleetEntry = buildSupervisorFleetEntry(normalized, processed);
      const routeCtx = advanceRoutePosition(locoId, normalized.speed_kmh || 0, 0);

      locomotiveState.set(locoId, {
        normalized,
        processed,
        alerts: [],
        fleetEntry,
        route: routeCtx,
      });
    }
    logger.info(`Loaded state for ${locomotiveState.size} locomotives from DB`);
  } catch (err) {
    logger.warn('Could not load state from DB (first run?)', { error: err.message });
  }
}

/**
 * Start a timer to broadcast fleet summaries independently of telemetry ticks.
 */
function startFleetSummaryTimer(wsBroadcast) {
  setInterval(() => {
    if (locomotiveState.size === 0) return;
    const fleet = buildFleetSummary();
    wsBroadcast('fleet_summary_update', fleet);
  }, FLEET_SUMMARY_INTERVAL * 1000);
  logger.info(`Fleet summary timer started (every ${FLEET_SUMMARY_INTERVAL}s)`);
}

module.exports = {
  processRawTelemetry,
  getLocomotiveSnapshot,
  getTrackedLocomotiveIds,
  buildSnapshotInit,
  buildFleetSummary,
  loadStateFromDb,
  startFleetSummaryTimer,
  locomotiveState,
};
