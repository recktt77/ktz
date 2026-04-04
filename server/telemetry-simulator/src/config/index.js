require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT, 10) || 8084,

    // Locomotive service endpoint
    locomotiveService: {
        baseUrl: process.env.LOCOMOTIVE_SERVICE_URL || 'http://localhost:8083',
        telemetryEndpoint: '/telemetry/raw',
        timeout: parseInt(process.env.HTTP_TIMEOUT_MS, 10) || 5000,
    },

    // Simulation defaults
    simulation: {
        intervalMs: parseInt(process.env.TICK_INTERVAL_MS, 10) || 1000,
        kz8aLocomotiveId: process.env.KZ8A_LOCOMOTIVE_ID || 'KTZ-4021',
        te33aLocomotiveId: process.env.TE33A_LOCOMOTIVE_ID || 'KTZ-7015',
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
};
