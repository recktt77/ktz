require('reflect-metadata');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const AppDataSource = require('./infrastructure/database/data-source');
const seedRoles = require('./infrastructure/database/seeds/seed-roles');
const errorHandler = require('./infrastructure/middleware/errorHandler');
const routes = require('./interface/routes');

async function bootstrap() {
    await AppDataSource.initialize();
    console.log('Database connected');

    await seedRoles();

    const app = express();

    app.use(helmet());
    app.use(cors({ origin: config.cors.origin, credentials: true }));
    app.use(morgan('short'));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'auth-service',
            uptime: process.uptime(),
        });
    });

    app.use(routes);

    app.use(errorHandler);

    app.listen(config.port, () => {
        console.log(`Auth Service running on port ${config.port}`);
    });
}

bootstrap().catch((err) => {
    console.error('Failed to start Auth Service:', err);
    process.exit(1);
});
