const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PG pool error', { error: err.message });
});

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${config.db.schema}`);
    logger.info(`Schema "${config.db.schema}" ready`);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${config.db.schema}, public`);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function getClient() {
  const client = await pool.connect();
  await client.query(`SET search_path TO ${config.db.schema}, public`);
  return client;
}

module.exports = { pool, query, getClient, initSchema };
