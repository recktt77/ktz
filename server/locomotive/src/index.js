const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { initSchema } = require('./db/pool');
const { migrate } = require('./db/migrate');
const rabbitPublisher = require('./services/rabbitPublisher');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const locomotiveRoutes = require('./routes/locomotives');
const telemetryRoutes = require('./routes/telemetry');
const modelRoutes = require('./routes/models');

const app = express();

// ===== Middleware =====
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('short', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Rate limiter for telemetry ingestion (generous for 1Hz * N locomotives)
const telemetryLimiter = rateLimit({
  windowMs: 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many telemetry requests, slow down' },
});

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'locomotive-service', uptime: process.uptime() });
});

// ===== Routes =====
app.use('/locomotives', locomotiveRoutes);
app.use('/telemetry', telemetryLimiter, telemetryRoutes);
app.use('/models', modelRoutes);

// ===== Error handler =====
app.use(errorHandler);

// ===== Startup =====
async function start() {
  try {
    // Initialize DB schema & run migrations
    await initSchema();
    await migrate();
    logger.info('Database ready');

    // Connect to RabbitMQ
    await rabbitPublisher.connect();

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Locomotive Service running on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start Locomotive Service', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await rabbitPublisher.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await rabbitPublisher.close();
  process.exit(0);
});

start();

module.exports = app;
