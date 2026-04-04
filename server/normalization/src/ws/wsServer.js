const { WebSocketServer } = require('ws');
const subscriptionManager = require('./subscriptionManager');
const { buildSnapshotInit } = require('../services/pipeline');
const config = require('../config');
const logger = require('../utils/logger');

let wss = null;

/**
 * Initialize the WebSocket server.
 */
function init(server) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info('WebSocket client connected', { ip: clientIp });

    ws.isAlive = true;

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

  logger.info('WebSocket server initialized at /ws');
}

/**
 * Handle messages from WebSocket clients.
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
        if (ws.readyState === 1) ws.send(msg);
      }
      break;
    }

    case 'alert_resolved': {
      const locoId = payload.locomotive_id;
      if (!locoId) return;
      const clients = subscriptionManager.getClientsForLocomotive(locoId);
      for (const ws of clients) {
        if (ws.readyState === 1) ws.send(msg);
      }
      break;
    }

    case 'dispatcher_overlay_update': {
      // Send to dispatchers
      const dispatchers = subscriptionManager.getClientsByRole('dispatcher');
      for (const ws of dispatchers) {
        if (ws.readyState === 1) ws.send(msg);
      }
      break;
    }

    case 'fleet_summary_update': {
      // Send to supervisors
      const supervisors = subscriptionManager.getClientsByRole('supervisor');
      for (const ws of supervisors) {
        if (ws.readyState === 1) ws.send(msg);
      }
      break;
    }

    case 'locomotive_status_update': {
      // Send to all
      for (const ws of subscriptionManager.getAllClients()) {
        if (ws.readyState === 1) ws.send(msg);
      }
      break;
    }

    default: {
      // Broadcast to all
      for (const ws of subscriptionManager.getAllClients()) {
        if (ws.readyState === 1) ws.send(msg);
      }
    }
  }
}

function getConnectionCount() {
  return subscriptionManager.size;
}

module.exports = { init, broadcast, getConnectionCount };
