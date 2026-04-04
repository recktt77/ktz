const fs = require('fs');
const path = require('path');
const { pool, initSchema } = require('./pool');
const config = require('../config');
const logger = require('../utils/logger');

async function migrate() {
  await initSchema();

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${config.db.schema}, public`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        logger.info(`Migration ${file} already applied, skipping`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`Applying migration: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Migration ${file} applied successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migration ${file} failed`, { error: err.message });
        throw err;
      }
    }

    logger.info('All migrations applied');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration failed', { error: err.message });
      process.exit(1);
    });
}

module.exports = { migrate };
