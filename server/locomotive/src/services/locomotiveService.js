const locomotiveRepo = require('../models/locomotiveRepo');
const logger = require('../utils/logger');

const locomotiveService = {
  async getAll(filters) {
    return locomotiveRepo.findAll(filters);
  },

  async getById(id) {
    const loco = await locomotiveRepo.findById(id);
    if (!loco) {
      const err = new Error(`Locomotive ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    return loco;
  },

  async create(data) {
    // Check for duplicate
    const existing = await locomotiveRepo.findById(data.id);
    if (existing) {
      const err = new Error(`Locomotive ${data.id} already exists`);
      err.statusCode = 409;
      throw err;
    }
    const loco = await locomotiveRepo.create(data);
    logger.info('Locomotive created', { id: loco.id, model: loco.model_code });
    return loco;
  },

  async update(id, data) {
    const loco = await locomotiveRepo.update(id, data);
    if (!loco) {
      const err = new Error(`Locomotive ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    logger.info('Locomotive updated', { id });
    return loco;
  },

  async delete(id) {
    const deleted = await locomotiveRepo.delete(id);
    if (!deleted) {
      const err = new Error(`Locomotive ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    logger.info('Locomotive deleted', { id });
    return true;
  },
};

module.exports = locomotiveService;
