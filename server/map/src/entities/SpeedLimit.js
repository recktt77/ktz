const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "SpeedLimit",
  tableName: "speed_limits",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
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
    max_speed_kmh: {
      type: "int",
    },
    reason: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    created_at: {
      type: "timestamp with time zone",
      createDate: true,
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
