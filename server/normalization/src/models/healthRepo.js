const { query } = require('../db/pool');

const healthRepo = {
  async insertDerived(locomotiveId, modelCode, timestampUtc, healthIndex, healthStatus, payload) {
    const { rows } = await query(
      `INSERT INTO derived_metrics (locomotive_id, model_code, timestamp_utc, health_index, health_status, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, locomotive_id, timestamp_utc`,
      [locomotiveId, modelCode, timestampUtc, healthIndex, healthStatus, JSON.stringify(payload)]
    );
    return rows[0];
  },

  async insertSnapshot(locomotiveId, timestampUtc, healthIndex, healthStatus, topFactors) {
    const { rows } = await query(
      `INSERT INTO health_snapshots (locomotive_id, timestamp_utc, health_index, health_status, top_factors)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [locomotiveId, timestampUtc, healthIndex, healthStatus, JSON.stringify(topFactors)]
    );
    return rows[0];
  },

  async findLatestHealth(locomotiveId) {
    const { rows } = await query(
      `SELECT * FROM health_snapshots
       WHERE locomotive_id = $1
       ORDER BY timestamp_utc DESC LIMIT 1`,
      [locomotiveId]
    );
    return rows[0] || null;
  },

  async findHealthHistory(locomotiveId, { from, to, limit = 500 } = {}) {
    const conditions = ['locomotive_id = $1'];
    const params = [locomotiveId];
    let idx = 2;

    if (from) {
      conditions.push(`timestamp_utc >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`timestamp_utc <= $${idx++}`);
      params.push(to);
    }
    params.push(limit);

    const sql = `
      SELECT * FROM health_snapshots
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp_utc DESC
      LIMIT $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  async findDerivedHistory(locomotiveId, { from, to, limit = 500 } = {}) {
    const conditions = ['locomotive_id = $1'];
    const params = [locomotiveId];
    let idx = 2;

    if (from) {
      conditions.push(`timestamp_utc >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`timestamp_utc <= $${idx++}`);
      params.push(to);
    }
    params.push(limit);

    const sql = `
      SELECT * FROM derived_metrics
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp_utc DESC
      LIMIT $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  async findLatestDerived(locomotiveId) {
    const { rows } = await query(
      `SELECT * FROM derived_metrics
       WHERE locomotive_id = $1
       ORDER BY timestamp_utc DESC LIMIT 1`,
      [locomotiveId]
    );
    return rows[0] || null;
  },
};

module.exports = healthRepo;
