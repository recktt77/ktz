const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "StationTrackCoverage",
  tableName: "station_track_coverage",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    station_id: {
      type: "uuid",
    },
    track_segment_id: {
      type: "uuid",
    },
    km_from: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    km_to: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
  },
  relations: {
    station: {
      type: "many-to-one",
      target: "Station",
      joinColumn: { name: "station_id" },
      onDelete: "CASCADE",
    },
    track_segment: {
      type: "many-to-one",
      target: "TrackSegment",
      joinColumn: { name: "track_segment_id" },
      onDelete: "CASCADE",
    },
  },
});
