const { query } = require('../db/pool');

async function findByLocomotiveAndRole(locomotiveId, role) {
  const { rows } = await query(
    `SELECT id, user_id, locomotive_id, role, phone_number
     FROM staff_assignments
     WHERE locomotive_id = $1 AND role = $2 AND is_active = true
     LIMIT 1`,
    [locomotiveId, role],
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await query(
    `SELECT id, user_id, locomotive_id, role, phone_number, is_active, assigned_at
     FROM staff_assignments
     ORDER BY locomotive_id, role`,
  );
  return rows;
}

async function create({ userId, locomotiveId, role, phoneNumber }) {
  const { rows } = await query(
    `INSERT INTO staff_assignments (user_id, locomotive_id, role, phone_number)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, locomotiveId, role, phoneNumber],
  );
  return rows[0];
}

async function deactivate(id) {
  const { rows } = await query(
    `UPDATE staff_assignments
     SET is_active = false, unassigned_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

module.exports = { findByLocomotiveAndRole, findAll, create, deactivate };
