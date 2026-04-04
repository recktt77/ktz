const telemetryService = require('../services/telemetryService');

const telemetryController = {
  /**
   * POST /telemetry/raw  — single raw telemetry ingestion
   */
  async ingestRaw(req, res, next) {
    try {
      const record = await telemetryService.ingestRaw(req.body);
      res.status(201).json({
        status: 'accepted',
        id: record.id,
        locomotive_id: record.locomotive_id,
        timestamp_utc: record.timestamp_utc,
        received_at: record.received_at,
      });
    } catch (err) {
      if (err.statusCode === 400) {
        return res.status(400).json({
          error: err.message,
          details: err.details || [],
        });
      }
      next(err);
    }
  },

  /**
   * POST /telemetry/bulk  — bulk ingestion
   */
  async ingestBulk(req, res, next) {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Body must be an array of telemetry packets' });
      }
      if (items.length > 1000) {
        return res.status(400).json({ error: 'Maximum 1000 items per bulk request' });
      }
      const results = await telemetryService.ingestBulk(items);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /telemetry/raw/:locomotiveId  — query raw history
   */
  async getRawHistory(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const { from, to, limit } = req.query;
      const rows = await telemetryService.getRawHistory(locomotiveId, {
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
   * GET /telemetry/raw/:locomotiveId/latest
   */
  async getLatestRaw(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const record = await telemetryService.getLatestRaw(locomotiveId);
      if (!record) {
        return res.status(404).json({ error: 'No telemetry found' });
      }
      res.json(record);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = telemetryController;
