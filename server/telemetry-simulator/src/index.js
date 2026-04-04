const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./lib/logger');
const simulatorRoutes = require('./routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'telemetry-simulator',
        uptime: process.uptime(),
    });
});

// Simulator control routes
app.use('/simulator', simulatorRoutes);

// Start
app.listen(config.port, () => {
    logger.info(`Telemetry-Simulator running on port ${config.port}`);
    logger.info(`Target: ${config.locomotiveService.baseUrl}${config.locomotiveService.telemetryEndpoint}`);
    logger.info(`Locomotives: KZ8A=${config.simulation.kz8aLocomotiveId}, TE33A=${config.simulation.te33aLocomotiveId}`);

    // Auto-start simulation after a short delay (let dependent services warm up)
    const autoStartDelay = parseInt(process.env.AUTO_START_DELAY_MS, 10) || 5000;
    setTimeout(() => {
        const { getEngine } = require('./engine/SimulatorEngine');
        const engine = getEngine();
        if (engine.state !== 'running') {
            engine.start();
            logger.info('Simulator auto-started');
        }
    }, autoStartDelay);
});
