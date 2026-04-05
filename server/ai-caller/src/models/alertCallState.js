const { query } = require('../db/pool');
const config = require('../config');

async function getOrCreate(alertId, locomotiveId, targetRole, alertContext) {
  // Try fetch first
  let { rows } = await query(
    `SELECT * FROM alert_call_state WHERE alert_id = $1`,
    [alertId],
  );

  if (rows.length > 0) return rows[0];

  // Create new
  const nextRetry = new Date(Date.now() + config.retry.intervalMs);
  ({ rows } = await query(
    `INSERT INTO alert_call_state (alert_id, locomotive_id, target_role, next_retry_at, max_retries, alert_context)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (alert_id) DO NOTHING
     RETURNING *`,
    [alertId, locomotiveId, targetRole, nextRetry, config.retry.maxRetries, alertContext ? JSON.stringify(alertContext) : null],
  ));

  // In case of race condition, fetch again
  if (rows.length === 0) {
    ({ rows } = await query(`SELECT * FROM alert_call_state WHERE alert_id = $1`, [alertId]));
  }

  return rows[0];
}

async function recordCall(alertId) {
  const nextRetry = new Date(Date.now() + config.retry.intervalMs);
  const { rows } = await query(
    `UPDATE alert_call_state
     SET last_call_at = NOW(),
         total_retries = total_retries + 1,
         next_retry_at = $2
     WHERE alert_id = $1
     RETURNING *`,
    [alertId, nextRetry],
  );
  return rows[0] || null;
}

async function markResolved(alertId) {
  await query(
    `UPDATE alert_call_state
     SET resolved = true, next_retry_at = NULL
     WHERE alert_id = $1`,
    [alertId],
  );
}

async function getDueRetries() {
  const { rows } = await query(
    `SELECT * FROM alert_call_state
     WHERE resolved = false
       AND next_retry_at IS NOT NULL
       AND next_retry_at <= NOW()
       AND total_retries < max_retries
     ORDER BY next_retry_at`,
  );
  return rows;
}

module.exports = { getOrCreate, recordCall, markResolved, getDueRetries };
