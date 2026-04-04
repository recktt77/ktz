const modelRepo = require('../models/modelRepo');

const modelController = {
  /**
   * GET /models  — list all locomotive models
   */
  async getAll(req, res, next) {
    try {
      const models = await modelRepo.findAll();
      res.json(models);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /models/:model/schema  — metric schema for a model
   */
  async getSchema(req, res, next) {
    try {
      const modelCode = req.params.model.toUpperCase();
      const model = await modelRepo.findByCode(modelCode);
      if (!model) {
        return res.status(404).json({ error: `Model ${modelCode} not found` });
      }
      const schema = await modelRepo.getSchema(modelCode);
      res.json({ model: model, schema });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = modelController;
