const { WebSocketServer } = require('ws');
const url = require('url');
const subscriptionManager = require('./subscriptionManager');
const { buildSnapshotInit } = require('../services/pipeline');
const config = require('../config');
const logger = require('../utils/logger');

let wss = null;

/**
 * Parse role and locomotiveId from WebSocket URL path.
 * Supported paths:
 *   /ws/live                   → { role: null, locomotiveIds: [] }   (raw feed, all locos)
 *   /ws/driver/{locomotiveId}  → { role: 'driver', locomotiveIds: [id] }
 *   /ws/dispatcher             → { role: 'dispatcher', locomotiveIds: [] }
 *   /ws/engineer/{locomotiveId}→ { role: 'engineer', locomotiveIds: [id] }
 *   /ws/supervisor             → { role: 'supervisor', locomotiveIds: [] }
 *   /ws                        → { role: null, locomotiveIds: [] }  (generic, subscribe via message)
 */
function parseWsPath(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  // parts: ['ws'] or ['ws', 'live'] or ['ws', 'driver', '{id}'] etc.

  if (parts.length < 2 || parts[0] !== 'ws') {
    return { role: null, locomotiveIds: [] };
  }

  const segment = parts[1];

  switch (segment) {
    case 'live':
      return { role: null, locomotiveIds: [] };

    case 'driver':
      return { role: 'driver', locomotiveIds: parts[2] ? [parts[2]] : [] };

    case 'dispatcher':
      return { role: 'dispatcher', locomotiveIds: [] };

    case 'engineer':
      return { role: 'engineer', locomotiveIds: parts[2] ? [parts[2]] : [] };

    case 'supervisor':
      return { role: 'supervisor', locomotiveIds: [] };

    default:
      return { role: null, locomotiveIds: [] };
  }
}

/**
 * Initialize the WebSocket server.
 * Supports both path-based routing (/ws/driver/{id}, /ws/dispatcher, etc.)
 * and message-based subscription (connect to /ws, send { type: 'subscribe', ... }).
 */
function init(server) {
  wss = new WebSocketServer({
    server,
    // Accept any path starting with /ws
    verifyClient: (info) => {
      const { pathname } = url.parse(info.req.url);
      return pathname.startsWith('/ws');
    },
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    const { pathname } = url.parse(req.url);
    logger.info('WebSocket client connected', { ip: clientIp, path: pathname });

    ws.isAlive = true;

    // Auto-subscribe based on URL path
    const { role, locomotiveIds } = parseWsPath(pathname);
    if (role) {
      subscriptionManager.subscribe(ws, role, locomotiveIds);
      // Send initial snapshot
      const snapshot = buildSnapshotInit(role, locomotiveIds);
      sendToClient(ws, { type: 'snapshot_init', payload: snapshot });
      logger.info('Auto-subscribed via path', { role, locomotiveIds, path: pathname });
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch (err) {
        logger.warn('Invalid WS message from client', { error: err.message });
      }
    });

    ws.on('close', () => {
      subscriptionManager.unsubscribe(ws);
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error('WebSocket client error', { error: err.message });
      subscriptionManager.unsubscribe(ws);
    });
  });

  // Heartbeat interval — detect dead connections
  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.warn('Heartbeat failed — terminating dead connection');
        subscriptionManager.unsubscribe(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  logger.info('WebSocket server initialized (paths: /ws, /ws/live, /ws/driver/{id}, /ws/dispatcher, /ws/engineer/{id}, /ws/supervisor)');
}

/**
 * Handle messages from WebSocket clients.
 * Supports message-based subscribe (for clients connecting to generic /ws).
 */
function handleClientMessage(ws, msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'subscribe': {
      const { role, locomotive_ids } = msg.payload || {};
      if (!role) {
        sendToClient(ws, { type: 'error', payload: { message: 'role is required' } });
        return;
      }
      subscriptionManager.subscribe(ws, role, locomotive_ids || []);

      // Send initial snapshot
      const snapshot = buildSnapshotInit(role, locomotive_ids || []);
      sendToClient(ws, { type: 'snapshot_init', payload: snapshot });
      break;
    }

    case 'ping': {
      sendToClient(ws, { type: 'pong', payload: null });
      break;
    }

    default:
      logger.debug('Unknown WS message type', { type: msg.type });
  }
}

/**
 * Send a JSON message to a specific client.
 */
function sendToClient(ws, msg) {
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast a message to relevant clients based on message type and payload.
 * This is the main entry point called by the processing pipeline.
 */
const BACKPRESSURE_LIMIT = 64 * 1024; // 64KB — skip slow clients

function safeSend(ws, msg) {
  if (ws.readyState === 1 && ws.bufferedAmount < BACKPRESSURE_LIMIT) {
    ws.send(msg);
  }
}

function broadcast(type, payload) {
  if (!wss) return;

  const msg = JSON.stringify({ type, payload });

  switch (type) {
    case 'telemetry_update':
    case 'processed_update':
    case 'alert_created':
    case 'route_context_update': {
      // Send to clients subscribed to this locomotive
      const locoId = payload.locomotive_id || payload.locomotiveId;
      if (!locoId) return;
      const clients = subscriptionManager.getClientsForLocomotive(locoId);
      for (const ws of clients) {
        safeSend(ws, msg);
      }
      break;
    }

    case 'alert_resolved': {
      const locoId = payload.locomotive_id;
      if (!locoId) return;
      const clients = subscriptionManager.getClientsForLocomotive(locoId);
      for (const ws of clients) {
        safeSend(ws, msg);
      }
      break;
    }

    case 'dispatcher_overlay_update': {
      // Send to dispatchers
      const dispatchers = subscriptionManager.getClientsByRole('dispatcher');
      for (const ws of dispatchers) {
        safeSend(ws, msg);
      }
      break;
    }

    case 'fleet_summary_update': {
      // Send to supervisors
      const supervisors = subscriptionManager.getClientsByRole('supervisor');
      for (const ws of supervisors) {
        safeSend(ws, msg);
      }
      break;
    }

    case 'locomotive_status_update': {
      // Send to all
      for (const ws of subscriptionManager.getAllClients()) {
        safeSend(ws, msg);
      }
      break;
    }

    default: {
      // Broadcast to all
      for (const ws of subscriptionManager.getAllClients()) {
        safeSend(ws, msg);
      }
    }
  }
}

function getConnectionCount() {
  return subscriptionManager.size;
}

module.exports = { init, broadcast, getConnectionCount };
