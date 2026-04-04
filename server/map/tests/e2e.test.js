/**
 * E2E tests for Map Service.
 *
 * Requires a running Postgres (map-db) on the port specified in .env.
 * Uses a real database — tables are synced via TypeORM synchronize:true.
 *
 * Run:  npm test
 */
const request = require("supertest");
const AppDataSource = require("../src/config/data-source");
const app = require("../src/app");

let server;

beforeAll(async () => {
  await AppDataSource.initialize();
  // Clean all tables in dependency order
  const entities = ["KmPoint", "SpeedLimit", "StationTrackCoverage", "TrackSegment", "Station", "Railway"];
  for (const name of entities) {
    await AppDataSource.getRepository(name).createQueryBuilder().delete().execute();
  }
  server = app.listen(0); // random port
});

afterAll(async () => {
  if (server) server.close();
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
});

// ─── Shared state across ordered tests ────────────────────────
const ids = {};

// ══════════════════════════════════════════════════════════════
// 1. Health
// ══════════════════════════════════════════════════════════════
describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "map-service" });
  });
});

// ══════════════════════════════════════════════════════════════
// 2. Railways CRUD
// ══════════════════════════════════════════════════════════════
describe("Railways", () => {
  it("POST /railways — creates a railway", async () => {
    const res = await request(app).post("/railways").send({
      name: "Астана — Караганда",
      code: "AST-KRG",
      total_length_km: "232.00",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Астана — Караганда");
    ids.railway = res.body.id;
  });

  it("POST /railways — validation error (no name)", async () => {
    const res = await request(app).post("/railways").send({ code: "X" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("POST /railways — duplicate code → 409", async () => {
    const res = await request(app).post("/railways").send({
      name: "Duplicate",
      code: "AST-KRG",
    });
    expect(res.status).toBe(409);
  });

  it("GET /railways — lists railways", async () => {
    const res = await request(app).get("/railways");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /railways/:id — returns one", async () => {
    const res = await request(app).get(`/railways/${ids.railway}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ids.railway);
  });

  it("GET /railways/:id — invalid uuid → 400", async () => {
    const res = await request(app).get("/railways/not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("GET /railways/:id — not found → 404", async () => {
    const res = await request(app).get("/railways/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("PATCH /railways/:id — updates", async () => {
    const res = await request(app)
      .patch(`/railways/${ids.railway}`)
      .send({ name: "Астана — Караганда (обн.)" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Астана — Караганда (обн.)");
  });
});

// ══════════════════════════════════════════════════════════════
// 3. Stations CRUD
// ══════════════════════════════════════════════════════════════
describe("Stations", () => {
  it("POST /stations — creates station A", async () => {
    const res = await request(app).post("/stations").send({
      name: "Астана-1",
      code: "ASTANA1",
      railway_id: ids.railway,
      position_km: "0.00",
      latitude: "51.128400",
      longitude: "71.430400",
    });
    expect(res.status).toBe(201);
    ids.stationA = res.body.id;
  });

  it("POST /stations — creates station B", async () => {
    const res = await request(app).post("/stations").send({
      name: "Караганда",
      code: "KARAGANDA",
      railway_id: ids.railway,
      position_km: "232.00",
      latitude: "49.804700",
      longitude: "73.109400",
    });
    expect(res.status).toBe(201);
    ids.stationB = res.body.id;
  });

  it("POST /stations — validation error (missing railway_id)", async () => {
    const res = await request(app).post("/stations").send({
      name: "Bad",
      code: "BAD",
      position_km: "0",
    });
    expect(res.status).toBe(400);
  });

  it("GET /stations — lists all", async () => {
    const res = await request(app).get("/stations");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("GET /stations?railway_id= — filters", async () => {
    const res = await request(app).get(`/stations?railway_id=${ids.railway}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("GET /stations/:id — returns one with railway relation", async () => {
    const res = await request(app).get(`/stations/${ids.stationA}`);
    expect(res.status).toBe(200);
    expect(res.body.railway).toBeDefined();
    expect(res.body.railway.id).toBe(ids.railway);
  });

  it("PATCH /stations/:id — updates", async () => {
    const res = await request(app)
      .patch(`/stations/${ids.stationA}`)
      .send({ name: "Астана-1 (главный вокзал)" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Астана-1 (главный вокзал)");
  });
});

// ══════════════════════════════════════════════════════════════
// 4. Track Segments CRUD
// ══════════════════════════════════════════════════════════════
describe("Track Segments", () => {
  it("POST /track-segments — creates segment", async () => {
    const res = await request(app).post("/track-segments").send({
      code: "SEG-AST-KRG",
      railway_id: ids.railway,
      start_station_id: ids.stationA,
      end_station_id: ids.stationB,
      start_km: "0.00",
      end_km: "232.00",
      length_km: "232.00",
    });
    expect(res.status).toBe(201);
    ids.segment = res.body.id;
  });

  it("POST /track-segments — validation error (missing fields)", async () => {
    const res = await request(app).post("/track-segments").send({ code: "X" });
    expect(res.status).toBe(400);
  });

  it("GET /track-segments — lists all", async () => {
    const res = await request(app).get("/track-segments");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].start_station).toBeDefined();
    expect(res.body[0].end_station).toBeDefined();
  });

  it("GET /track-segments?railway_id= — filters", async () => {
    const res = await request(app).get(`/track-segments?railway_id=${ids.railway}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("GET /track-segments/:id — returns one with relations", async () => {
    const res = await request(app).get(`/track-segments/${ids.segment}`);
    expect(res.status).toBe(200);
    expect(res.body.railway).toBeDefined();
    expect(res.body.start_station).toBeDefined();
    expect(res.body.end_station).toBeDefined();
  });

  it("PATCH /track-segments/:id — updates", async () => {
    const res = await request(app)
      .patch(`/track-segments/${ids.segment}`)
      .send({ length_km: "231.50" });
    expect(res.status).toBe(200);
    expect(res.body.length_km).toBe("231.50");
  });
});

// ══════════════════════════════════════════════════════════════
// 5. Station Coverage
// ══════════════════════════════════════════════════════════════
describe("Station Coverage", () => {
  it("POST /station-coverage — creates coverage", async () => {
    const res = await request(app).post("/station-coverage").send({
      station_id: ids.stationA,
      track_segment_id: ids.segment,
      km_from: "0.00",
      km_to: "50.00",
    });
    expect(res.status).toBe(201);
    ids.coverage = res.body.id;
  });

  it("POST /station-coverage — validation error", async () => {
    const res = await request(app).post("/station-coverage").send({
      station_id: "not-uuid",
    });
    expect(res.status).toBe(400);
  });

  it("GET /station-coverage — lists all", async () => {
    const res = await request(app).get("/station-coverage");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].station).toBeDefined();
    expect(res.body[0].track_segment).toBeDefined();
  });

  it("GET /station-coverage?station_id= — filters by station", async () => {
    const res = await request(app).get(`/station-coverage?station_id=${ids.stationA}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("GET /station-coverage?segment_id= — filters by segment", async () => {
    const res = await request(app).get(`/station-coverage?segment_id=${ids.segment}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. Speed Limits
// ══════════════════════════════════════════════════════════════
describe("Speed Limits", () => {
  it("POST /speed-limits — creates speed limit", async () => {
    const res = await request(app).post("/speed-limits").send({
      track_segment_id: ids.segment,
      km_from: "0.00",
      km_to: "10.00",
      max_speed_kmh: 60,
      reason: "Станционная зона",
    });
    expect(res.status).toBe(201);
    ids.speedLimit = res.body.id;
  });

  it("POST /speed-limits — second limit", async () => {
    const res = await request(app).post("/speed-limits").send({
      track_segment_id: ids.segment,
      km_from: "10.00",
      km_to: "232.00",
      max_speed_kmh: 140,
      reason: "Перегон",
    });
    expect(res.status).toBe(201);
    ids.speedLimit2 = res.body.id;
  });

  it("POST /speed-limits — validation error", async () => {
    const res = await request(app).post("/speed-limits").send({
      track_segment_id: ids.segment,
      km_from: "0",
      km_to: "10",
      max_speed_kmh: -5,
    });
    expect(res.status).toBe(400);
  });

  it("GET /speed-limits — lists all", async () => {
    const res = await request(app).get("/speed-limits");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("GET /speed-limits?segment_id= — filters", async () => {
    const res = await request(app).get(`/speed-limits?segment_id=${ids.segment}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // Order by km_from
    expect(parseFloat(res.body[0].km_from)).toBeLessThan(parseFloat(res.body[1].km_from));
  });
});

// ══════════════════════════════════════════════════════════════
// 7. Km Points
// ══════════════════════════════════════════════════════════════
describe("Km Points", () => {
  it("POST /km-points — creates km point (station type)", async () => {
    const res = await request(app).post("/km-points").send({
      track_segment_id: ids.segment,
      km: "0.00",
      name: "Астана-1",
      type: "station",
      latitude: "51.128400",
      longitude: "71.430400",
    });
    expect(res.status).toBe(201);
    ids.kmPoint = res.body.id;
  });

  it("POST /km-points — creates km point (bridge type)", async () => {
    const res = await request(app).post("/km-points").send({
      track_segment_id: ids.segment,
      km: "50.00",
      name: "Мост через р. Есиль",
      type: "bridge",
    });
    expect(res.status).toBe(201);
    ids.kmPoint2 = res.body.id;
  });

  it("POST /km-points — validation error (invalid type)", async () => {
    const res = await request(app).post("/km-points").send({
      track_segment_id: ids.segment,
      km: "10.00",
      name: "Bad",
      type: "invalid_type",
    });
    expect(res.status).toBe(400);
  });

  it("GET /km-points — lists all", async () => {
    const res = await request(app).get("/km-points");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("GET /km-points?segment_id= — filters and ordered by km", async () => {
    const res = await request(app).get(`/km-points?segment_id=${ids.segment}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(parseFloat(res.body[0].km)).toBeLessThan(parseFloat(res.body[1].km));
  });
});

// ══════════════════════════════════════════════════════════════
// 8. Map Aggregate Endpoints
// ══════════════════════════════════════════════════════════════
describe("Map aggregates", () => {
  it("GET /map/overview — returns railways, stations, segments", async () => {
    const res = await request(app).get("/map/overview");
    expect(res.status).toBe(200);
    expect(res.body.railways).toBeDefined();
    expect(res.body.stations).toBeDefined();
    expect(res.body.segments).toBeDefined();
    expect(res.body.railways.length).toBe(1);
    expect(res.body.stations.length).toBe(2);
    expect(res.body.segments.length).toBe(1);
  });

  it("GET /map/station/:stationId — returns station + coverages + speed limits + km points", async () => {
    const res = await request(app).get(`/map/station/${ids.stationA}`);
    expect(res.status).toBe(200);
    expect(res.body.station).toBeDefined();
    expect(res.body.station.id).toBe(ids.stationA);
    expect(res.body.station.railway).toBeDefined();
    expect(res.body.coverages).toBeDefined();
    expect(res.body.coverages.length).toBe(1);
    expect(res.body.speedLimits).toBeDefined();
    expect(res.body.speedLimits.length).toBe(2);
    expect(res.body.kmPoints).toBeDefined();
    expect(res.body.kmPoints.length).toBe(2);
  });

  it("GET /map/station/:stationId — not found → 404", async () => {
    const res = await request(app).get("/map/station/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("GET /map/station/:stationId — invalid uuid → 400", async () => {
    const res = await request(app).get("/map/station/bad-id");
    expect(res.status).toBe(400);
  });

  it("GET /map/segment/:segmentId — returns segment + speed limits + km points + stations", async () => {
    const res = await request(app).get(`/map/segment/${ids.segment}`);
    expect(res.status).toBe(200);
    expect(res.body.segment).toBeDefined();
    expect(res.body.segment.id).toBe(ids.segment);
    expect(res.body.segment.railway).toBeDefined();
    expect(res.body.segment.start_station).toBeDefined();
    expect(res.body.segment.end_station).toBeDefined();
    expect(res.body.speedLimits).toBeDefined();
    expect(res.body.speedLimits.length).toBe(2);
    expect(res.body.kmPoints).toBeDefined();
    expect(res.body.kmPoints.length).toBe(2);
    expect(res.body.stations).toBeDefined();
    expect(res.body.stations.length).toBe(1);
  });

  it("GET /map/segment/:segmentId — not found → 404", async () => {
    const res = await request(app).get("/map/segment/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// 9. DELETE — clean up in reverse dependency order
// ══════════════════════════════════════════════════════════════
describe("DELETE operations", () => {
  it("DELETE /km-points/:id — removes km point", async () => {
    const res = await request(app).delete(`/km-points/${ids.kmPoint}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /km-points/:id — not found → 404", async () => {
    const res = await request(app).delete(`/km-points/${ids.kmPoint}`);
    expect(res.status).toBe(404);
  });

  it("DELETE /speed-limits/:id — removes speed limit", async () => {
    const res = await request(app).delete(`/speed-limits/${ids.speedLimit}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /station-coverage/:id — removes coverage", async () => {
    const res = await request(app).delete(`/station-coverage/${ids.coverage}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /track-segments/:id — removes segment", async () => {
    const res = await request(app).delete(`/track-segments/${ids.segment}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /stations/:id — removes station", async () => {
    const res = await request(app).delete(`/stations/${ids.stationA}`);
    expect(res.status).toBe(204);
  });

  it("DELETE /railways/:id — removes railway (cascades stations)", async () => {
    const res = await request(app).delete(`/railways/${ids.railway}`);
    expect(res.status).toBe(204);
  });

  it("GET /railways — empty after delete", async () => {
    const res = await request(app).get("/railways");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it("DELETE /railways/:id — invalid uuid → 400", async () => {
    const res = await request(app).delete("/railways/not-a-uuid");
    expect(res.status).toBe(400);
  });
});
