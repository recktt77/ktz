const { query, getClient } = require('../db/pool');

const telemetryRepo = {
  /**
   * Insert a single raw telemetry record.
   */
  async insertRaw(locomotiveId, modelCode, timestampUtc, payload) {
    const { rows } = await query(
      `INSERT INTO telemetry_raw (locomotive_id, model_code, timestamp_utc, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING id, locomotive_id, timestamp_utc, received_at`,
      [locomotiveId, modelCode, timestampUtc, JSON.stringify(payload)]
    );
    return rows[0];
  },

  /**
   * Bulk insert raw telemetry records (within a transaction).
   */
  async insertRawBulk(records) {
    const client = await getClient();
    const results = [];
    try {
      await client.query('BEGIN');
      for (const rec of records) {
        const { rows } = await client.query(
          `INSERT INTO telemetry_raw (locomotive_id, model_code, timestamp_utc, payload)
           VALUES ($1, $2, $3, $4)
           RETURNING id, locomotive_id, timestamp_utc, received_at`,
          [rec.locomotive_id, rec.model_code, rec.timestamp_utc, JSON.stringify(rec.payload)]
        );
        results.push(rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Query raw telemetry for a locomotive with time range.
   */
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
      SELECT id, locomotive_id, model_code, timestamp_utc, payload, received_at
      FROM telemetry_raw
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp_utc DESC
      LIMIT $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  /**
   * Get latest telemetry for a locomotive.
   */
  async findLatest(locomotiveId) {
    const { rows } = await query(
      `SELECT id, locomotive_id, model_code, timestamp_utc, payload, received_at
       FROM telemetry_raw
       WHERE locomotive_id = $1
       ORDER BY timestamp_utc DESC
       LIMIT 1`,
      [locomotiveId]
    );
    return rows[0] || null;
  },

  /**
   * Insert a fault event.
   */
  async insertFault(locomotiveId, faultCode, faultText, timestampUtc, payload) {
    const { rows } = await query(
      `INSERT INTO fault_events_raw (locomotive_id, fault_code, fault_text, timestamp_utc, payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [locomotiveId, faultCode, faultText || null, timestampUtc, payload ? JSON.stringify(payload) : null]
    );
    return rows[0];
  },

  /**
   * Cleanup old telemetry beyond retention window.
   */
  async purgeOlderThan(hours) {
    const { rowCount } = await query(
      `DELETE FROM telemetry_raw WHERE timestamp_utc < NOW() - INTERVAL '1 hour' * $1`,
      [hours]
    );
    return rowCount;
  },
};

module.exports = telemetryRepo;
