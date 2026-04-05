require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8080,

  services: {
    auth: process.env.AUTH_URL || 'http://localhost:8081',
    map: process.env.MAP_URL || 'http://localhost:8082',
    locomotive: process.env.LOCOMOTIVE_URL || 'http://localhost:8083',
    normalization: process.env.NORMALIZATION_URL || 'http://localhost:8085',
    normalizationWs: process.env.NORMALIZATION_WS_URL || 'http://localhost:8086',
    aiCaller: process.env.AI_CALLER_URL || 'http://localhost:8087',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  },
};
