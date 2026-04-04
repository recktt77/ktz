const configRepo = require('../models/configRepo');
const { refreshConfigCache } = require('../services/healthCalculator');
const { refreshThresholdCache } = require('../services/pipeline');

const configController = {
  /**
   * GET /thresholds
   */
  async getThresholds(req, res, next) {
    try {
      const { model_code } = req.query;
      const thresholds = await configRepo.getThresholds(model_code);
      res.json(thresholds);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /thresholds
   * Body: { model_code, metric, warning, critical, direction }
   */
  async updateThreshold(req, res, next) {
    try {
      const { model_code, metric, warning, critical, direction } = req.body;
      if (!model_code || !metric) {
        return res.status(400).json({ error: 'model_code and metric are required' });
      }
      const result = await configRepo.upsertThreshold(model_code, metric, warning, critical, direction);
      // Refresh caches
      await refreshConfigCache();
      await refreshThresholdCache();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /weights
   */
  async getWeights(req, res, next) {
    try {
      const { model_code } = req.query;
      const weights = await configRepo.getWeights(model_code);
      res.json(weights);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /weights
   * Body: { model_code, factor, weight }
   */
  async updateWeight(req, res, next) {
    try {
      const { model_code, factor, weight } = req.body;
      if (!model_code || !factor || weight == null) {
        return res.status(400).json({ error: 'model_code, factor, and weight are required' });
      }
      const result = await configRepo.upsertWeight(model_code, factor, weight);
      await refreshConfigCache();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = configController;
