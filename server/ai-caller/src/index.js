const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');

const config = require('./config');
const logger = require('./utils/logger');
const { initSchema } = require('./db/pool');
const { migrate } = require('./db/migrate');
const rabbitConsumer = require('./consumers/rabbitConsumer');
const asteriskService = require('./services/asteriskService');
const audioSocketServer = require('./ws/audioSocketServer');
const callOrchestrator = require('./services/callOrchestrator');
const retryScheduler = require('./services/retryScheduler');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-caller',
    uptime: process.uptime(),
    active_calls: callOrchestrator.getActiveCallCount(),
  });
});

// REST API
app.use('/', routes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function start() {
  try {
    // 1. DB: schema + migrations
    await initSchema();
    await migrate();
    logger.info('Database initialized');

    // 2. Start Express HTTP server
    const httpServer = http.createServer(app);
    httpServer.listen(config.port, () => {
      logger.info({ port: config.port }, 'REST API server started');
    });

    // 3. Start AudioSocket WebSocket server
    audioSocketServer.start();

    // 4. Connect to Asterisk ARI
    await asteriskService.connect();

    // 5. Connect to RabbitMQ and start consuming
    await rabbitConsumer.connect(
      callOrchestrator.handleCriticalAlert,
      callOrchestrator.handleAlertResolved,
    );

    // 6. Start retry scheduler
    retryScheduler.start();

    logger.info('AI-Caller service fully started');

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info({ signal }, 'Shutdown signal received');

      retryScheduler.stop();

      // Wait for active calls to finish (max 30s)
      const maxWait = 30_000;
      const start = Date.now();
      while (callOrchestrator.getActiveCallCount() > 0 && Date.now() - start < maxWait) {
        logger.info({ active: callOrchestrator.getActiveCallCount() }, 'Waiting for active calls to finish...');
        await new Promise(r => setTimeout(r, 2_000));
      }

      await rabbitConsumer.close();
      await asteriskService.close();
      audioSocketServer.close();
      httpServer.close();

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.fatal({ err }, 'Failed to start AI-Caller service');
    process.exit(1);
  }
}

start();
