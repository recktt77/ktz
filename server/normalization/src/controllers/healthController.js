const healthRepo = require('../models/healthRepo');
const { getLocomotiveSnapshot } = require('../services/pipeline');

const healthController = {
  /**
   * GET /health-index/:locomotiveId
   */
  async getHealthIndex(req, res, next) {
    try {
      const { locomotiveId } = req.params;

      // Try in-memory first
      const state = getLocomotiveSnapshot(locomotiveId);
      if (state?.processed) {
        return res.json({
          locomotive_id: locomotiveId,
          health_index: state.processed.health_index,
          health_status: state.processed.health_status,
          timestamp_utc: state.processed.timestamp_utc,
          top_factors: state.processed.top_factors,
        });
      }

      // Fallback to DB
      const snapshot = await healthRepo.findLatestHealth(locomotiveId);
      if (!snapshot) {
        return res.status(404).json({ error: 'No health data found' });
      }
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /snapshots/:locomotiveId — latest processed snapshot
   */
  async getSnapshot(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const state = getLocomotiveSnapshot(locomotiveId);
      if (state) {
        return res.json({
          telemetry: state.normalized,
          processed: state.processed,
          alerts: state.alerts || [],
        });
      }

      const derived = await healthRepo.findLatestDerived(locomotiveId);
      if (!derived) {
        return res.status(404).json({ error: 'No snapshot found' });
      }
      res.json(derived);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /history/:locomotiveId — derived metrics history
   */
  async getHistory(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const { from, to, limit } = req.query;
      const rows = await healthRepo.findDerivedHistory(locomotiveId, {
        from: from || undefined,
        to: to || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /replay/:locomotiveId — replay last N minutes
   */
  async getReplay(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const minutes = parseInt(req.query.minutes, 10) || 5;

      // Cap at 15 minutes
      const cappedMinutes = Math.min(minutes, 15);
      const from = new Date(Date.now() - cappedMinutes * 60 * 1000).toISOString();

      const rows = await healthRepo.findDerivedHistory(locomotiveId, {
        from,
        limit: cappedMinutes * 60, // ~1 per second
      });

      // Return in chronological order
      rows.reverse();
      res.json({
        locomotive_id: locomotiveId,
        minutes: cappedMinutes,
        from,
        count: rows.length,
        snapshots: rows,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = healthController;
