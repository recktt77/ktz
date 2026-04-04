const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "KmPoint",
  tableName: "km_points",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    track_segment_id: {
      type: "uuid",
    },
    km: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    name: {
      type: "varchar",
      length: 255,
    },
    type: {
      type: "enum",
      enum: ["station", "signal", "switch", "bridge", "crossing", "other"],
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
  },
  relations: {
    track_segment: {
      type: "many-to-one",
      target: "TrackSegment",
      joinColumn: { name: "track_segment_id" },
      onDelete: "CASCADE",
    },
  },
});
