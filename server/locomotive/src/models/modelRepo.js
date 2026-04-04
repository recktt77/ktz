const { query } = require('../db/pool');

const modelRepo = {
  async findAll() {
    const { rows } = await query('SELECT * FROM locomotive_models ORDER BY code');
    return rows;
  },

  async findByCode(code) {
    const { rows } = await query('SELECT * FROM locomotive_models WHERE code = $1', [code]);
    return rows[0] || null;
  },

  async getSchema(modelCode) {
    const { rows } = await query(
      `SELECT field_name, data_type, unit, min_value, max_value, description
       FROM metric_schemas
       WHERE model_code = $1
       ORDER BY field_name`,
      [modelCode]
    );
    return rows;
  },
};

module.exports = modelRepo;
