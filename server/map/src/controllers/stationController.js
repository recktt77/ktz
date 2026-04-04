const AppDataSource = require("../config/data-source");

const repo = () => AppDataSource.getRepository("Station");

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.railway_id) where.railway_id = req.query.railway_id;
    const items = await repo().find({
      where,
      relations: ["railway"],
      order: { position_km: "ASC" },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await repo().findOneOrFail({
      where: { id: req.params.id },
      relations: ["railway"],
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = repo().create(req.body);
    const saved = await repo().save(item);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await repo().findOneByOrFail({ id: req.params.id });
    repo().merge(item, req.body);
    const saved = await repo().save(item);
    res.json(saved);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await repo().findOneByOrFail({ id: req.params.id });
    await repo().remove(item);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
