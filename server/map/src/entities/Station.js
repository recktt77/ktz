const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Station",
  tableName: "stations",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: {
      type: "varchar",
      length: 255,
    },
    code: {
      type: "varchar",
      length: 50,
      unique: true,
    },
    railway_id: {
      type: "uuid",
    },
    position_km: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    latitude: {
      type: "decimal",
      precision: 9,
      scale: 6,
      nullable: true,
    },
    longitude: {
      type: "decimal",
      precision: 9,
      scale: 6,
      nullable: true,
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
    start_segments: {
      type: "one-to-many",
      target: "TrackSegment",
      inverseSide: "start_station",
    },
    end_segments: {
      type: "one-to-many",
      target: "TrackSegment",
      inverseSide: "end_station",
    },
    coverages: {
      type: "one-to-many",
      target: "StationTrackCoverage",
      inverseSide: "station",
    },
  },
});
