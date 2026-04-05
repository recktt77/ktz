const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authMiddleware, requireRole } = require('./auth');
const config = require('./config');

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan('short'));

// ─── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: process.uptime() });
});

// ─── Proxy helpers ───────────────────────────────────────
function proxy(target, pathRewrite) {
  const opts = {
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    on: {
      error(err, _req, res) {
        console.error(`Proxy error → ${target}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Service unavailable' });
        }
      },
    },
  };
  if (pathRewrite) opts.pathRewrite = pathRewrite;
  return createProxyMiddleware(opts);
}

// ─── Auth Service (:8081) — public endpoints ────────────
app.use('/auth', proxy(config.services.auth, { '^/': '/auth/' }));

// ─── Protected routes below — JWT required ───────────────
app.use('/users', authMiddleware, requireRole('admin'), proxy(config.services.auth, { '^/': '/users/' }));
app.use('/roles', authMiddleware, proxy(config.services.auth, { '^/': '/roles/' }));
app.use('/stations', authMiddleware, proxy(config.services.auth, { '^/': '/stations/' }));

// ─── Map Service (:8082) ─────────────────────────────────
app.use('/railways', authMiddleware, proxy(config.services.map, { '^/': '/railways/' }));
app.use('/track-segments', authMiddleware, proxy(config.services.map, { '^/': '/track-segments/' }));
app.use('/speed-limits', authMiddleware, proxy(config.services.map, { '^/': '/speed-limits/' }));
app.use('/km-points', authMiddleware, proxy(config.services.map, { '^/': '/km-points/' }));
app.use('/station-coverage', authMiddleware, proxy(config.services.map, { '^/': '/station-coverage/' }));
app.use('/map', authMiddleware, proxy(config.services.map, { '^/': '/map/' }));

// ─── Locomotive Service (:8083) ──────────────────────────
app.use('/locomotives', authMiddleware, proxy(config.services.locomotive, { '^/': '/locomotives/' }));
app.use('/telemetry', proxy(config.services.locomotive, { '^/': '/telemetry/' })); // no auth — simulator sends here
app.use('/models', authMiddleware, proxy(config.services.locomotive, { '^/': '/models/' }));

// ─── Normalization Service (:8085 REST) ──────────────────
app.use('/health-index', authMiddleware, proxy(config.services.normalization, { '^/': '/health-index/' }));
app.use('/snapshots', authMiddleware, proxy(config.services.normalization, { '^/': '/snapshots/' }));
app.use('/history', authMiddleware, proxy(config.services.normalization, { '^/': '/history/' }));
app.use('/replay', authMiddleware, proxy(config.services.normalization, { '^/': '/replay/' }));
app.use('/role-view', authMiddleware, proxy(config.services.normalization, { '^/': '/role-view/' }));
app.use('/poll', proxy(config.services.normalization, { '^/': '/poll/' }));
app.use('/thresholds', authMiddleware, requireRole('admin', 'engineer'), proxy(config.services.normalization, { '^/': '/thresholds/' }));
app.use('/weights', authMiddleware, requireRole('admin', 'engineer'), proxy(config.services.normalization, { '^/': '/weights/' }));
app.use('/reports', authMiddleware, proxy(config.services.normalization, { '^/': '/reports/' }));

// ─── AI-Caller Service (:8087) ───────────────────────────
app.use('/ai-caller', authMiddleware, proxy(config.services.aiCaller, { '^/ai-caller': '/' }));

// ─── WebSocket proxy (:8086) ─────────────────────────────
// NOTE: ws: false — we handle upgrade manually via server.on('upgrade').
// Using ws: true + manual upgrade causes double-handling and instant disconnects.
const wsProxy = createProxyMiddleware({
  target: config.services.normalizationWs,
  changeOrigin: true,
  ws: false,
  timeout: 0, // no timeout for WS
  on: {
    error(err, _req, res) {
      console.error('WS proxy error:', err.message);
      if (res && !res.headersSent) {
        res.status(502).json({ error: 'WebSocket service unavailable' });
      }
    },
  },
});
app.use('/ws', wsProxy);

// ─── 404 ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ───────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`API Gateway on :${config.port}`);
  console.log('  Auth         →', config.services.auth);
  console.log('  Map          →', config.services.map);
  console.log('  Locomotive   →', config.services.locomotive);
  console.log('  Normalization→', config.services.normalization);
  console.log('  WS           →', config.services.normalizationWs);
  console.log('  AI-Caller    →', config.services.aiCaller);
});

// Manually handle upgrade for WS proxy
server.on('upgrade', (req, socket, head) => {
  wsProxy.upgrade(req, socket, head);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
