require("reflect-metadata");
const { DataSource } = require("typeorm");
const config = require("./index");

const Railway = require("../entities/Railway");
const Station = require("../entities/Station");
const TrackSegment = require("../entities/TrackSegment");
const StationTrackCoverage = require("../entities/StationTrackCoverage");
const SpeedLimit = require("../entities/SpeedLimit");
const KmPoint = require("../entities/KmPoint");

const AppDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.user,
  password: config.db.password,
  database: config.db.name,
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities: [Railway, Station, TrackSegment, StationTrackCoverage, SpeedLimit, KmPoint],
});

module.exports = AppDataSource;
