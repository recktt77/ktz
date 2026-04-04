const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "TrackSegment",
  tableName: "track_segments",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    code: {
      type: "varchar",
      length: 50,
      unique: true,
    },
    railway_id: {
      type: "uuid",
    },
    start_station_id: {
      type: "uuid",
    },
    end_station_id: {
      type: "uuid",
    },
    start_km: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    end_km: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    length_km: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    created_at: {
      type: "timestamp with time zone",
      createDate: true,
    },
    updated_at: {
      type: "timestamp with time zone",
      updateDate: true,
    },
  },
  relations: {
    railway: {
      type: "many-to-one",
      target: "Railway",
      joinColumn: { name: "railway_id" },
      onDelete: "CASCADE",
    },
    start_station: {
      type: "many-to-one",
      target: "Station",
      joinColumn: { name: "start_station_id" },
      onDelete: "CASCADE",
    },
    end_station: {
      type: "many-to-one",
      target: "Station",
      joinColumn: { name: "end_station_id" },
      onDelete: "CASCADE",
    },
    coverages: {
      type: "one-to-many",
      target: "StationTrackCoverage",
      inverseSide: "track_segment",
    },
    speed_limits: {
      type: "one-to-many",
      target: "SpeedLimit",
      inverseSide: "track_segment",
    },
    km_points: {
      type: "one-to-many",
      target: "KmPoint",
      inverseSide: "track_segment",
    },
  },
});
