const AppDataSource = require("../config/data-source");

const repo = () => AppDataSource.getRepository("SpeedLimit");

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.segment_id) where.track_segment_id = req.query.segment_id;
    const items = await repo().find({
      where,
      relations: ["track_segment"],
      order: { km_from: "ASC" },
    });
    res.json(items);
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

exports.remove = async (req, res, next) => {
  try {
    const item = await repo().findOneByOrFail({ id: req.params.id });
    await repo().remove(item);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
