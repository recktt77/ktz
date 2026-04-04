const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Railway",
  tableName: "railways",
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
    description: {
      type: "text",
      nullable: true,
    },
    total_length_km: {
      type: "decimal",
      precision: 10,
      scale: 2,
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
    stations: {
      type: "one-to-many",
      target: "Station",
      inverseSide: "railway",
    },
    track_segments: {
      type: "one-to-many",
      target: "TrackSegment",
      inverseSide: "railway",
    },
  },
});
