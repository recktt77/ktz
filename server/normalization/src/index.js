const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const { initSchema } = require('./db/pool');
const { migrate } = require('./db/migrate');
const rabbitConsumer = require('./services/rabbitConsumer');
const { processRawTelemetry, refreshThresholdCache } = require('./services/pipeline');
const { refreshConfigCache } = require('./services/healthCalculator');
const wsServer = require('./ws/wsServer');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/health');
const roleViewRoutes = require('./routes/roleViews');
const configRoutes = require('./routes/config');
const reportRoutes = require('./routes/reports');

const app = express();

// ===== Middleware =====
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('short', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'normalization-service',
    uptime: process.uptime(),
    wsConnections: wsServer.getConnectionCount(),
  });
});

// ===== REST Routes =====
app.use('/', healthRoutes);
app.use('/role-view', roleViewRoutes);
app.use('/', configRoutes);
app.use('/reports', reportRoutes);

// ===== Error handler =====
app.use(errorHandler);

// ===== Startup =====
async function start() {
  try {
    // DB
    await initSchema();
    await migrate();
    logger.info('Database ready');

    // Load config caches
    await refreshConfigCache();
    await refreshThresholdCache();
    logger.info('Config caches loaded');

    // HTTP server for REST API
    const httpServer = http.createServer(app);

    // Separate HTTP server for WebSocket (API Gateway proxies :8080 → :8086)
    const wsHttpServer = http.createServer();
    wsServer.init(wsHttpServer);

    // Connect RabbitMQ consumer — pass pipeline handler
    await rabbitConsumer.connect((event) => {
      return processRawTelemetry(event, wsServer.broadcast);
    });

    // Start REST API
    httpServer.listen(config.port, () => {
      logger.info(`Normalization REST API on port ${config.port}`);
    });

    // Start WebSocket server
    wsHttpServer.listen(config.wsPort, () => {
      logger.info(`Normalization WebSocket on port ${config.wsPort} (API Gateway proxies :8080 → :${config.wsPort})`);
    });

  } catch (err) {
    logger.error('Failed to start Normalization Service', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await rabbitConsumer.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await rabbitConsumer.close();
  process.exit(0);
});

start();

module.exports = app;
