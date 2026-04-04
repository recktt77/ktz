const { body, param, query } = require("express-validator");

const uuid = (field) => param(field).isUUID().withMessage(`${field} must be a valid UUID`);

const uuidBody = (field) => body(field).isUUID().withMessage(`${field} must be a valid UUID`);

const railway = {
  create: [
    body("name").trim().notEmpty().withMessage("name is required"),
    body("code").trim().notEmpty().withMessage("code is required"),
    body("total_length_km").optional().isDecimal().withMessage("total_length_km must be a number"),
  ],
  update: [
    uuid("id"),
    body("name").optional().trim().notEmpty(),
    body("code").optional().trim().notEmpty(),
    body("total_length_km").optional().isDecimal(),
  ],
};

const station = {
  create: [
    body("name").trim().notEmpty().withMessage("name is required"),
    body("code").trim().notEmpty().withMessage("code is required"),
    body("railway_id").isUUID().withMessage("railway_id must be a valid UUID"),
    body("position_km").isDecimal().withMessage("position_km must be a number"),
    body("latitude").optional().isDecimal(),
    body("longitude").optional().isDecimal(),
  ],
  update: [
    uuid("id"),
    body("name").optional().trim().notEmpty(),
    body("code").optional().trim().notEmpty(),
    body("railway_id").optional().isUUID(),
    body("position_km").optional().isDecimal(),
    body("latitude").optional().isDecimal(),
    body("longitude").optional().isDecimal(),
  ],
};

const trackSegment = {
  create: [
    body("code").trim().notEmpty().withMessage("code is required"),
    body("railway_id").isUUID().withMessage("railway_id must be a valid UUID"),
    body("start_station_id").isUUID().withMessage("start_station_id must be a valid UUID"),
    body("end_station_id").isUUID().withMessage("end_station_id must be a valid UUID"),
    body("start_km").isDecimal().withMessage("start_km must be a number"),
    body("end_km").isDecimal().withMessage("end_km must be a number"),
    body("length_km").isDecimal().withMessage("length_km must be a number"),
  ],
  update: [
    uuid("id"),
    body("code").optional().trim().notEmpty(),
    body("railway_id").optional().isUUID(),
    body("start_station_id").optional().isUUID(),
    body("end_station_id").optional().isUUID(),
    body("start_km").optional().isDecimal(),
    body("end_km").optional().isDecimal(),
    body("length_km").optional().isDecimal(),
  ],
};

const stationCoverage = {
  create: [
    uuidBody("station_id"),
    uuidBody("track_segment_id"),
    body("km_from").isDecimal().withMessage("km_from must be a number"),
    body("km_to").isDecimal().withMessage("km_to must be a number"),
  ],
};

const speedLimit = {
  create: [
    uuidBody("track_segment_id"),
    body("km_from").isDecimal().withMessage("km_from must be a number"),
    body("km_to").isDecimal().withMessage("km_to must be a number"),
    body("max_speed_kmh").isInt({ min: 0 }).withMessage("max_speed_kmh must be a positive integer"),
    body("reason").optional().trim(),
  ],
};

const kmPoint = {
  create: [
    uuidBody("track_segment_id"),
    body("km").isDecimal().withMessage("km must be a number"),
    body("name").trim().notEmpty().withMessage("name is required"),
    body("type")
      .isIn(["station", "signal", "switch", "bridge", "crossing", "other"])
      .withMessage("type must be one of: station, signal, switch, bridge, crossing, other"),
    body("latitude").optional().isDecimal(),
    body("longitude").optional().isDecimal(),
  ],
};

const listByRailway = [query("railway_id").optional().isUUID()];
const listBySegment = [query("segment_id").optional().isUUID()];

module.exports = {
  uuid,
  railway,
  station,
  trackSegment,
  stationCoverage,
  speedLimit,
  kmPoint,
  listByRailway,
  listBySegment,
};
