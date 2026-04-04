const locomotiveService = require('../services/locomotiveService');

const locomotiveController = {
  async getAll(req, res, next) {
    try {
      const { status, model_code, limit, offset } = req.query;
      const locos = await locomotiveService.getAll({
        status,
        model_code,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      res.json(locos);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const loco = await locomotiveService.getById(req.params.id);
      res.json(loco);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const loco = await locomotiveService.create(req.body);
      res.status(201).json(loco);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const loco = await locomotiveService.update(req.params.id, req.body);
      res.json(loco);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await locomotiveService.delete(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = locomotiveController;
