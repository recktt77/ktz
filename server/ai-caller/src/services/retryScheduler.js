const alertCallState = require('../models/alertCallState');
const staffAssignment = require('../models/staffAssignment');
const callOrchestrator = require('./callOrchestrator');
const config = require('../config');
const logger = require('../utils/logger');

let intervalHandle = null;

function start() {
  intervalHandle = setInterval(checkRetries, config.retry.checkIntervalMs);
  logger.info({ intervalMs: config.retry.checkIntervalMs }, 'Retry scheduler started');
}

async function checkRetries() {
  try {
    const dueRetries = await alertCallState.getDueRetries();

    if (dueRetries.length === 0) return;

    logger.info({ count: dueRetries.length }, 'Retry scheduler: found due retries');

    for (const state of dueRetries) {
      // Rebuild the alert event from state for the orchestrator
      // We need the original alert context — fetch from normalization DB or cache
      // For retries, we re-call with the same locomotive + role
      const assignment = await staffAssignment.findByLocomotiveAndRole(
        state.locomotive_id,
        state.target_role,
      );

      if (!assignment) {
        logger.warn({ alert_id: state.alert_id, locomotive_id: state.locomotive_id }, 'No staff for retry, skipping');
        continue;
      }

      logger.info({
        alert_id: state.alert_id,
        locomotive_id: state.locomotive_id,
        role: state.target_role,
        retry: state.total_retries + 1,
      }, 'retry_scheduled');

      // Get alert context from DB (persisted when alert first arrived)
      const alertEvent = state.alert_context || {
        alert_id: state.alert_id,
        locomotive_id: state.locomotive_id,
        locomotive_model: 'unknown',
        metric: 'unknown',
        component: null,
        value: null,
        threshold: null,
        title: 'Повторное уведомление о критическом отклонении',
        timestamp: state.first_call_at,
      };

      // Use the orchestrator to make the call
      try {
        await callOrchestrator.makeCall(alertEvent, state.target_role, assignment);
      } catch (err) {
        logger.error({ err, alert_id: state.alert_id }, 'Retry call failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Retry scheduler error');
  }
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  logger.info('Retry scheduler stopped');
}

module.exports = { start, stop };
