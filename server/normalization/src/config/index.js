require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8085,
  wsPort: parseInt(process.env.WS_PORT, 10) || 8086,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'realtime_ktzh',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    schema: process.env.DB_SCHEMA || 'normalization',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: 'telemetry',
    queue: 'normalization.raw',
    routingKeys: {
      rawReceived: 'telemetry.raw.received',
      rawInvalid: 'telemetry.raw.invalid',
    },
    publishKeys: {
      normalizedCreated: 'telemetry.normalized.created',
      healthUpdated: 'health.snapshot.updated',
      roleViewUpdated: 'role.view.updated',
    },
  },

  processing: {
    smoothingWindow: parseInt(process.env.SMOOTHING_WINDOW, 10) || 5,
    dedupWindowMs: parseInt(process.env.DEDUP_WINDOW_MS, 10) || 500,
    historyRetentionHours: parseInt(process.env.HISTORY_RETENTION_HOURS, 10) || 72,
  },
};
