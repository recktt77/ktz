require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8087,
  audioSocketPort: parseInt(process.env.AUDIO_SOCKET_PORT, 10) || 9090,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'realtime_ktzh',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    schema: process.env.DB_SCHEMA || 'ai_caller',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: 'telemetry',
    queues: {
      criticalAlerts: 'ai_caller.critical_alerts',
      resolvedAlerts: 'ai_caller.resolved_alerts',
    },
    routingKeys: {
      alertCriticalCreated: 'alert.critical.created',
      alertCriticalResolved: 'alert.critical.resolved',
    },
  },

  asterisk: {
    ariUrl: process.env.ASTERISK_ARI_URL || 'http://asterisk:8088',
    ariUser: process.env.ASTERISK_ARI_USER || 'ai-caller',
    ariPassword: process.env.ASTERISK_ARI_PASSWORD || 'aicaller_secret',
    context: 'ai-caller-outbound',
    callTimeout: parseInt(process.env.CALL_TIMEOUT_SEC, 10) || 60,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
    realtimeUrl: 'wss://api.openai.com/v1/realtime',
    voice: process.env.OPENAI_VOICE || 'alloy',
  },

  retry: {
    intervalMs: parseInt(process.env.RETRY_INTERVAL_MS, 10) || 300_000, // 5 min
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 5,
    checkIntervalMs: 60_000, // check every 60s
  },
};
