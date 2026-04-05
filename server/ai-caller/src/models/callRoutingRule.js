const { query } = require('../db/pool');

/**
 * Find the best matching routing rule for a given alert.
 * Priority: model-specific rules > generic rules, higher priority wins.
 */
async function findTargetRole(metric, component, modelCode) {
  const { rows } = await query(
    `SELECT target_role FROM call_routing_rules
     WHERE is_active = true
       AND (model_code = $1 OR model_code IS NULL)
       AND (metric_pattern = $2 OR ($3::text IS NOT NULL AND component = $3))
     ORDER BY
       CASE WHEN model_code IS NOT NULL THEN 0 ELSE 1 END,
       priority DESC
     LIMIT 1`,
    [modelCode, metric, component],
  );
  return rows[0]?.target_role || null;
}

async function findAll() {
  const { rows } = await query(
    `SELECT * FROM call_routing_rules ORDER BY priority DESC`,
  );
  return rows;
}

async function create({ modelCode, metricPattern, component, targetRole, priority }) {
  const { rows } = await query(
    `INSERT INTO call_routing_rules (model_code, metric_pattern, component, target_role, priority)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [modelCode || null, metricPattern, component || null, targetRole, priority || 0],
  );
  return rows[0];
}

async function update(id, fields) {
  const sets = [];
  const values = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase → snake_case
    sets.push(`${col} = $${idx}`);
    values.push(val);
    idx++;
  }
  values.push(id);

  const { rows } = await query(
    `UPDATE call_routing_rules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] || null;
}

module.exports = { findTargetRole, findAll, create, update };
