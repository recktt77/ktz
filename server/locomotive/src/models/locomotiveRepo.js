const { query } = require('../db/pool');

const locomotiveRepo = {
  async findAll({ status, model_code, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (model_code) {
      conditions.push(`model_code = $${idx++}`);
      params.push(model_code);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT * FROM locomotives
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM locomotives WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create({ id, model_code, name, status, track_segment_id, position_km }) {
    const { rows } = await query(
      `INSERT INTO locomotives (id, model_code, name, status, track_segment_id, position_km)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, model_code, name || null, status || 'active', track_segment_id || null, position_km ?? null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const sets = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (['name', 'status', 'track_segment_id', 'position_km'].includes(key)) {
        sets.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `
      UPDATE locomotives
      SET ${sets.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await query('DELETE FROM locomotives WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async updatePosition(id, track_segment_id, position_km) {
    const { rows } = await query(
      `UPDATE locomotives
       SET track_segment_id = $2, position_km = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, track_segment_id, position_km]
    );
    return rows[0] || null;
  },
};

module.exports = locomotiveRepo;
