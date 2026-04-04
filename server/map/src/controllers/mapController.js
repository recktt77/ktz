const AppDataSource = require("../config/data-source");

exports.overview = async (_req, res, next) => {
  try {
    const railways = await AppDataSource.getRepository("Railway").find({
      order: { name: "ASC" },
    });
    const stations = await AppDataSource.getRepository("Station").find({
      relations: ["railway"],
      order: { position_km: "ASC" },
    });
    const segments = await AppDataSource.getRepository("TrackSegment").find({
      relations: ["start_station", "end_station"],
      order: { start_km: "ASC" },
    });
    const speed_limits = await AppDataSource.getRepository("SpeedLimit").find({
      order: { km_from: "ASC" },
    });

    res.json({ railways, stations, segments, speed_limits });
  } catch (err) {
    next(err);
  }
};

exports.byStation = async (req, res, next) => {
  try {
    const stationId = req.params.stationId;

    const station = await AppDataSource.getRepository("Station").findOneOrFail({
      where: { id: stationId },
      relations: ["railway"],
    });

    const coverages = await AppDataSource.getRepository("StationTrackCoverage").find({
      where: { station_id: stationId },
      relations: ["track_segment"],
    });

    const segmentIds = coverages.map((c) => c.track_segment_id);

    let speedLimits = [];
    let kmPoints = [];

    if (segmentIds.length > 0) {
      speedLimits = await AppDataSource.getRepository("SpeedLimit")
        .createQueryBuilder("sl")
        .where("sl.track_segment_id IN (:...ids)", { ids: segmentIds })
        .orderBy("sl.km_from", "ASC")
        .getMany();

      kmPoints = await AppDataSource.getRepository("KmPoint")
        .createQueryBuilder("kp")
        .where("kp.track_segment_id IN (:...ids)", { ids: segmentIds })
        .orderBy("kp.km", "ASC")
        .getMany();
    }

    res.json({ station, coverages, speedLimits, kmPoints });
  } catch (err) {
    next(err);
  }
};

exports.bySegment = async (req, res, next) => {
  try {
    const segmentId = req.params.segmentId;

    const segment = await AppDataSource.getRepository("TrackSegment").findOneOrFail({
      where: { id: segmentId },
      relations: ["railway", "start_station", "end_station"],
    });

    const speedLimits = await AppDataSource.getRepository("SpeedLimit").find({
      where: { track_segment_id: segmentId },
      order: { km_from: "ASC" },
    });

    const kmPoints = await AppDataSource.getRepository("KmPoint").find({
      where: { track_segment_id: segmentId },
      order: { km: "ASC" },
    });

    const stations = await AppDataSource.getRepository("StationTrackCoverage").find({
      where: { track_segment_id: segmentId },
      relations: ["station"],
    });

    res.json({ segment, speedLimits, kmPoints, stations: stations.map((s) => s.station) });
  } catch (err) {
    next(err);
  }
};
