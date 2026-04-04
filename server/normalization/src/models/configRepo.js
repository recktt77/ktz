const { query } = require('../db/pool');

const configRepo = {
  // ===== Thresholds =====
  async getThresholds(modelCode) {
    const conditions = [];
    const params = [];
    if (modelCode) {
      conditions.push('model_code = $1');
      params.push(modelCode);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM threshold_configs ${where} ORDER BY model_code, metric`, params);
    return rows;
  },

  async upsertThreshold(modelCode, metric, warning, critical, direction) {
    const { rows } = await query(
      `INSERT INTO threshold_configs (model_code, metric, warning, critical, direction, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (model_code, metric) DO UPDATE
       SET warning = $3, critical = $4, direction = $5, updated_at = NOW()
       RETURNING *`,
      [modelCode, metric, warning, critical, direction || 'upper']
    );
    return rows[0];
  },

  // ===== Weights =====
  async getWeights(modelCode) {
    const conditions = [];
    const params = [];
    if (modelCode) {
      conditions.push('model_code = $1');
      params.push(modelCode);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM weight_configs ${where} ORDER BY model_code, factor`, params);
    return rows;
  },

  async upsertWeight(modelCode, factor, weight) {
    const { rows } = await query(
      `INSERT INTO weight_configs (model_code, factor, weight, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (model_code, factor) DO UPDATE
       SET weight = $3, updated_at = NOW()
       RETURNING *`,
      [modelCode, factor, weight]
    );
    return rows[0];
  },

  // ===== Alerts =====
  async insertAlert(alert) {
    const { rows } = await query(
      `INSERT INTO alerts (id, locomotive_id, model_code, severity, title, message, component, metric, value, threshold, timestamp_utc, acknowledged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [alert.id, alert.locomotive_id, alert.model_code, alert.severity, alert.title,
       alert.message, alert.component, alert.metric, alert.value, alert.threshold,
       alert.timestamp_utc, alert.acknowledged || false]
    );
    return rows[0];
  },

  async resolveAlert(alertId) {
    const { rows } = await query(
      `UPDATE alerts SET resolved_at = NOW() WHERE id = $1 RETURNING *`,
      [alertId]
    );
    return rows[0] || null;
  },

  async getActiveAlerts(locomotiveId) {
    const conditions = ['resolved_at IS NULL'];
    const params = [];
    if (locomotiveId) {
      conditions.push(`locomotive_id = $${params.length + 1}`);
      params.push(locomotiveId);
    }
    const { rows } = await query(
      `SELECT * FROM alerts WHERE ${conditions.join(' AND ')} ORDER BY timestamp_utc DESC LIMIT 200`,
      params
    );
    return rows;
  },
};

module.exports = configRepo;
