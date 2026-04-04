require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8083,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'realtime_ktzh',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    schema: process.env.DB_SCHEMA || 'locomotive',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: 'telemetry',
    routingKeys: {
      rawReceived: 'telemetry.raw.received',
      rawInvalid: 'telemetry.raw.invalid',
    },
  },

  telemetry: {
    retentionHours: parseInt(process.env.RAW_TELEMETRY_RETENTION_HOURS, 10) || 72,
  },
};
