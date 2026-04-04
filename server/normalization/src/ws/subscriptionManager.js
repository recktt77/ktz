const logger = require('../utils/logger');

/**
 * Manages WebSocket client subscriptions.
 * Each client subscribes with a role and optional locomotive IDs.
 */

class SubscriptionManager {
  constructor() {
    // Map<ws, { role, locomotiveIds: Set<string> }>
    this.subscriptions = new Map();
    // Reverse index: Map<locomotiveId, Set<ws>>
    this.byLocomotive = new Map();
    // Role-based sets: Map<role, Set<ws>>
    this.byRole = new Map();
  }

  subscribe(ws, role, locomotiveIds = []) {
    // Remove any existing subscription for this ws
    this.unsubscribe(ws);

    const locoSet = new Set(locomotiveIds);
    this.subscriptions.set(ws, { role, locomotiveIds: locoSet });

    // Index by role
    if (!this.byRole.has(role)) this.byRole.set(role, new Set());
    this.byRole.get(role).add(ws);

    // Index by locomotive
    for (const id of locoSet) {
      if (!this.byLocomotive.has(id)) this.byLocomotive.set(id, new Set());
      this.byLocomotive.get(id).add(ws);
    }

    // If no specific locomotiveIds, the client wants all — mark with '*'
    if (locoSet.size === 0) {
      if (!this.byLocomotive.has('*')) this.byLocomotive.set('*', new Set());
      this.byLocomotive.get('*').add(ws);
    }

    logger.info('Client subscribed', { role, locomotiveIds: Array.from(locoSet) });
  }

  unsubscribe(ws) {
    const sub = this.subscriptions.get(ws);
    if (!sub) return;

    // Remove from role index
    this.byRole.get(sub.role)?.delete(ws);

    // Remove from locomotive index
    for (const id of sub.locomotiveIds) {
      this.byLocomotive.get(id)?.delete(ws);
    }
    this.byLocomotive.get('*')?.delete(ws);

    this.subscriptions.delete(ws);
  }

  /**
   * Get all WebSocket clients that should receive updates for a given locomotive.
   */
  getClientsForLocomotive(locomotiveId) {
    const clients = new Set();
    // Clients subscribed to this specific loco
    const specific = this.byLocomotive.get(locomotiveId);
    if (specific) {
      for (const ws of specific) clients.add(ws);
    }
    // Clients subscribed to all ('*')
    const wildcard = this.byLocomotive.get('*');
    if (wildcard) {
      for (const ws of wildcard) clients.add(ws);
    }
    return clients;
  }

  /**
   * Get all WebSocket clients subscribed to a specific role.
   */
  getClientsByRole(role) {
    return this.byRole.get(role) || new Set();
  }

  /**
   * Get all connected clients.
   */
  getAllClients() {
    return new Set(this.subscriptions.keys());
  }

  getSubscription(ws) {
    return this.subscriptions.get(ws) || null;
  }

  get size() {
    return this.subscriptions.size;
  }
}

module.exports = new SubscriptionManager();
