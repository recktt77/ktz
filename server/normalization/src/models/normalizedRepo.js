const { query } = require('../db/pool');

const normalizedRepo = {
  async insert(locomotiveId, modelCode, timestampUtc, metrics) {
    const { rows } = await query(
      `INSERT INTO telemetry_normalized (locomotive_id, model_code, timestamp_utc, metrics)
       VALUES ($1, $2, $3, $4)
       RETURNING id, locomotive_id, timestamp_utc, received_at`,
      [locomotiveId, modelCode, timestampUtc, JSON.stringify(metrics)]
    );
    return rows[0];
  },

  async findByLocomotive(locomotiveId, { from, to, limit = 500 } = {}) {
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
      SELECT id, locomotive_id, model_code, timestamp_utc, metrics, received_at
      FROM telemetry_normalized
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp_utc DESC
      LIMIT $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  async findLatest(locomotiveId) {
    const { rows } = await query(
      `SELECT * FROM telemetry_normalized
       WHERE locomotive_id = $1
       ORDER BY timestamp_utc DESC LIMIT 1`,
      [locomotiveId]
    );
    return rows[0] || null;
  },

  /**
   * Find distinct locomotive IDs with data in the last N minutes.
   */
  async findDistinctLocomotives(withinMinutes = 60) {
    const { rows } = await query(
      `SELECT DISTINCT locomotive_id
       FROM telemetry_normalized
       WHERE timestamp_utc >= NOW() - INTERVAL '1 minute' * $1
       ORDER BY locomotive_id`,
      [withinMinutes]
    );
    return rows;
  },
};

module.exports = normalizedRepo;
