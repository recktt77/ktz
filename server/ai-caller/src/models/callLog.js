const { query } = require('../db/pool');

async function create({ alertId, locomotiveId, targetRole, targetUserId, retryCount }) {
  const { rows } = await query(
    `INSERT INTO call_log (alert_id, locomotive_id, target_role, target_user_id, retry_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [alertId, locomotiveId, targetRole, targetUserId || null, retryCount || 0],
  );
  return rows[0];
}

async function updateStatus(id, { callStatus, answeredAt, endedAt, durationSec, asteriskCallId, errorMessage }) {
  const { rows } = await query(
    `UPDATE call_log SET
       call_status = COALESCE($2, call_status),
       answered_at = COALESCE($3, answered_at),
       ended_at = COALESCE($4, ended_at),
       duration_sec = COALESCE($5, duration_sec),
       asterisk_call_id = COALESCE($6, asterisk_call_id),
       error_message = COALESCE($7, error_message)
     WHERE id = $1
     RETURNING *`,
    [id, callStatus, answeredAt || null, endedAt || null, durationSec || null, asteriskCallId || null, errorMessage || null],
  );
  return rows[0] || null;
}

async function findByAlert(alertId) {
  const { rows } = await query(
    `SELECT * FROM call_log WHERE alert_id = $1 ORDER BY created_at DESC`,
    [alertId],
  );
  return rows;
}

async function findRecent(limit = 50) {
  const { rows } = await query(
    `SELECT * FROM call_log ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

module.exports = { create, updateStatus, findByAlert, findRecent };
