const callRoutingRule = require('../models/callRoutingRule');
const staffAssignment = require('../models/staffAssignment');
const callLog = require('../models/callLog');
const alertCallState = require('../models/alertCallState');
const asteriskService = require('./asteriskService');
const { buildSystemPrompt } = require('./messageBuilder');
const { startBridge } = require('./audioBridge');
const logger = require('../utils/logger');

// Track active calls to prevent duplicates
const activeCalls = new Set();

// Cache alert context for retries (alert_id → alertEvent)
const alertContextCache = new Map();

/**
 * Handle a new critical alert: determine target, call them.
 */
async function handleCriticalAlert(alertEvent) {
  const { alert_id, locomotive_id, locomotive_model, metric, component } = alertEvent;

  // Prevent duplicate calls for the same alert
  if (activeCalls.has(alert_id)) {
    logger.debug({ alert_id }, 'Call already in progress for this alert');
    return;
  }

  try {
    // 1. Determine who to call
    const targetRole = await callRoutingRule.findTargetRole(metric, component, locomotive_model);
    if (!targetRole) {
      logger.warn({ alert_id, metric, component }, 'No routing rule found, defaulting to dispatcher');
    }
    const role = targetRole || 'dispatcher';

    // 2. Check cooldown
    const state = await alertCallState.getOrCreate(alert_id, locomotive_id, role, alertEvent);
    if (state.resolved) {
      logger.info({ alert_id }, 'Alert already resolved, skipping');
      return;
    }

    // 3. Find staff assignment (phone number)
    const assignment = await staffAssignment.findByLocomotiveAndRole(locomotive_id, role);
    if (!assignment) {
      logger.error({ alert_id, locomotive_id, role }, 'No staff assigned for locomotive/role');
      return;
    }

    // 4. Make the call
    alertContextCache.set(alert_id, alertEvent);
    await makeCall(alertEvent, role, assignment);

  } catch (err) {
    logger.error({ err, alert_id }, 'Error handling critical alert');
  }
}

/**
 * Execute the actual call: bridge setup → Asterisk originate → wait.
 */
async function makeCall(alertEvent, targetRole, assignment) {
  const { alert_id, locomotive_id } = alertEvent;
  const { user_id, phone_number } = assignment;

  activeCalls.add(alert_id);

  // Create call log entry
  const state = await alertCallState.getOrCreate(alert_id, locomotive_id, targetRole);
  const logEntry = await callLog.create({
    alertId: alert_id,
    locomotiveId: locomotive_id,
    targetRole,
    targetUserId: user_id,
    retryCount: state.total_retries,
  });

  try {
    // Build system prompt (no personal data, only user_id + alert context)
    const systemPrompt = buildSystemPrompt(alertEvent, targetRole, user_id);

    // Start audio bridge (creates AudioSocket listener)
    const { audioSocketId, waitForEnd } = startBridge(systemPrompt);

    // Originate SIP call through Asterisk
    logger.info({ alert_id, locomotive_id, role: targetRole, user_id }, 'call_initiated');

    const { channelId } = await asteriskService.originateCall(phone_number, audioSocketId);

    // Update log with Asterisk channel ID
    await callLog.updateStatus(logEntry.id, {
      callStatus: 'ringing',
      asteriskCallId: channelId,
    });

    // Wait for call to end (hangup / timeout / GPT done)
    const result = await waitForEnd;

    // Determine final status
    const callStatus = result.durationSec > 3 ? 'completed' : 'no_answer';

    await callLog.updateStatus(logEntry.id, {
      callStatus,
      answeredAt: result.durationSec > 0 ? new Date(Date.now() - result.durationSec * 1000) : null,
      endedAt: new Date(),
      durationSec: result.durationSec,
    });

    // Update retry state
    await alertCallState.recordCall(alert_id);

    logger.info({
      alert_id,
      locomotive_id,
      role: targetRole,
      call_status: callStatus,
      duration_sec: result.durationSec,
      retry_count: state.total_retries,
    }, 'call_completed');

  } catch (err) {
    logger.error({ err, alert_id }, 'call_failed');
    await callLog.updateStatus(logEntry.id, {
      callStatus: 'failed',
      endedAt: new Date(),
      errorMessage: err.message,
    });
    await alertCallState.recordCall(alert_id);
  } finally {
    activeCalls.delete(alert_id);
  }
}

/**
 * Handle alert resolution — cancel retries.
 */
async function handleAlertResolved(payload) {
  const { alert_id } = payload;
  await alertCallState.markResolved(alert_id);
  alertContextCache.delete(alert_id);
  logger.info({ alert_id }, 'Alert resolved, retries cancelled');
}

/**
 * Get cached alert context (for retries).
 */
function getAlertContext(alertId) {
  return alertContextCache.get(alertId) || null;
}

/**
 * Get count of active calls.
 */
function getActiveCallCount() {
  return activeCalls.size;
}

module.exports = { handleCriticalAlert, handleAlertResolved, makeCall, getActiveCallCount, getAlertContext };
