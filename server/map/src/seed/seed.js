/**
 * Seed script — fills the map schema with realistic KTZ data.
 *
 * Run:  node src/seed/seed.js
 */
const AppDataSource = require("../config/data-source");

async function seed() {
  await AppDataSource.initialize();
  console.log("Connected. Seeding map data…");

  const railwayRepo = AppDataSource.getRepository("Railway");
  const stationRepo = AppDataSource.getRepository("Station");
  const segmentRepo = AppDataSource.getRepository("TrackSegment");
  const coverageRepo = AppDataSource.getRepository("StationTrackCoverage");
  const speedLimitRepo = AppDataSource.getRepository("SpeedLimit");
  const kmPointRepo = AppDataSource.getRepository("KmPoint");

  // ── 1. Railway ────────────────────────────────────────────
  const railway = await railwayRepo.save(
    railwayRepo.create({
      name: "Целиноградское отделение (Астана — Караганда)",
      code: "ASTANA-KARAGANDA",
      description:
        "Главный ход Астана — Караганда, одна из ключевых магистралей Казахстан Темір Жолы",
      total_length_km: 232,
    })
  );
  console.log("  Railway created:", railway.name);

  // ── 2. Stations ───────────────────────────────────────────
  const stationsData = [
    { name: "Астана-1",                   code: "ASTANA1",   position_km: 0,     lat: 51.1284,  lng: 71.4304 },
    { name: "Астана-2",                   code: "ASTANA2",   position_km: 5,     lat: 51.1155,  lng: 71.4189 },
    { name: "Сары-Арка",                  code: "SARYARKA",  position_km: 18,    lat: 51.0960,  lng: 71.3600 },
    { name: "Акмол",                      code: "AKMOL",     position_km: 55,    lat: 51.0200,  lng: 71.0200 },
    { name: "Караганда-Сортировочная",    code: "KRGD-SORT", position_km: 200,   lat: 49.8350,  lng: 73.0890 },
    { name: "Караганда",                  code: "KARAGANDA", position_km: 232,   lat: 49.8047,  lng: 73.1094 },
  ];

  const stations = {};
  for (const s of stationsData) {
    const saved = await stationRepo.save(
      stationRepo.create({
        name: s.name,
        code: s.code,
        railway_id: railway.id,
        position_km: s.position_km,
        latitude: s.lat,
        longitude: s.lng,
      })
    );
    stations[s.code] = saved;
  }
  console.log("  Stations created:", Object.keys(stations).length);

  // ── 3. Track segments ─────────────────────────────────────
  const segmentsData = [
    { code: "SEG-AST1-AST2",   from: "ASTANA1",  to: "ASTANA2",  start_km: 0,   end_km: 5 },
    { code: "SEG-AST2-SARY",   from: "ASTANA2",  to: "SARYARKA", start_km: 5,   end_km: 18 },
    { code: "SEG-SARY-AKM",    from: "SARYARKA", to: "AKMOL",    start_km: 18,  end_km: 55 },
    { code: "SEG-AKM-KSORT",   from: "AKMOL",    to: "KRGD-SORT",start_km: 55,  end_km: 200 },
    { code: "SEG-KSORT-KRGD",  from: "KRGD-SORT",to: "KARAGANDA",start_km: 200, end_km: 232 },
  ];

  const segments = {};
  for (const seg of segmentsData) {
    const saved = await segmentRepo.save(
      segmentRepo.create({
        code: seg.code,
        railway_id: railway.id,
        start_station_id: stations[seg.from].id,
        end_station_id: stations[seg.to].id,
        start_km: seg.start_km,
        end_km: seg.end_km,
        length_km: seg.end_km - seg.start_km,
      })
    );
    segments[seg.code] = saved;
  }
  console.log("  Segments created:", Object.keys(segments).length);

  // ── 4. Station track coverage ─────────────────────────────
  // Each station "covers" ±5 km around itself on adjacent segments
  const coveragesData = [
    { station: "ASTANA1",  segment: "SEG-AST1-AST2",  km_from: 0,   km_to: 5 },
    { station: "ASTANA2",  segment: "SEG-AST1-AST2",  km_from: 0,   km_to: 5 },
    { station: "ASTANA2",  segment: "SEG-AST2-SARY",  km_from: 5,   km_to: 18 },
    { station: "SARYARKA", segment: "SEG-AST2-SARY",  km_from: 5,   km_to: 18 },
    { station: "SARYARKA", segment: "SEG-SARY-AKM",   km_from: 18,  km_to: 37 },
    { station: "AKMOL",    segment: "SEG-SARY-AKM",   km_from: 37,  km_to: 55 },
    { station: "AKMOL",    segment: "SEG-AKM-KSORT",  km_from: 55,  km_to: 127 },
    { station: "KRGD-SORT",segment: "SEG-AKM-KSORT",  km_from: 127, km_to: 200 },
    { station: "KRGD-SORT",segment: "SEG-KSORT-KRGD", km_from: 200, km_to: 216 },
    { station: "KARAGANDA",segment: "SEG-KSORT-KRGD", km_from: 216, km_to: 232 },
  ];
  for (const c of coveragesData) {
    await coverageRepo.save(
      coverageRepo.create({
        station_id: stations[c.station].id,
        track_segment_id: segments[c.segment].id,
        km_from: c.km_from,
        km_to: c.km_to,
      })
    );
  }
  console.log("  Coverages created:", coveragesData.length);

  // ── 5. Speed limits ───────────────────────────────────────
  const speedLimitsData = [
    { segment: "SEG-AST1-AST2",  km_from: 0,   km_to: 5,   max: 60,  reason: "Станционная зона Астана-1" },
    { segment: "SEG-AST2-SARY",  km_from: 5,   km_to: 8,   max: 80,  reason: "Выход из станционной зоны" },
    { segment: "SEG-AST2-SARY",  km_from: 8,   km_to: 18,  max: 120, reason: "Перегон" },
    { segment: "SEG-SARY-AKM",   km_from: 18,  km_to: 20,  max: 80,  reason: "Станционная зона Сары-Арка" },
    { segment: "SEG-SARY-AKM",   km_from: 20,  km_to: 55,  max: 140, reason: "Перегон" },
    { segment: "SEG-AKM-KSORT",  km_from: 55,  km_to: 58,  max: 80,  reason: "Станционная зона Акмол" },
    { segment: "SEG-AKM-KSORT",  km_from: 58,  km_to: 110, max: 140, reason: "Перегон" },
    { segment: "SEG-AKM-KSORT",  km_from: 110, km_to: 130, max: 100, reason: "Кривая, ограничение по плану линии" },
    { segment: "SEG-AKM-KSORT",  km_from: 130, km_to: 200, max: 120, reason: "Перегон" },
    { segment: "SEG-KSORT-KRGD", km_from: 200, km_to: 205, max: 60,  reason: "Станционная зона Караганда-Сортировочная" },
    { segment: "SEG-KSORT-KRGD", km_from: 205, km_to: 228, max: 100, reason: "Перегон" },
    { segment: "SEG-KSORT-KRGD", km_from: 228, km_to: 232, max: 40,  reason: "Станционная зона Караганда" },
  ];
  for (const sl of speedLimitsData) {
    await speedLimitRepo.save(
      speedLimitRepo.create({
        track_segment_id: segments[sl.segment].id,
        km_from: sl.km_from,
        km_to: sl.km_to,
        max_speed_kmh: sl.max,
        reason: sl.reason,
      })
    );
  }
  console.log("  Speed limits created:", speedLimitsData.length);

  // ── 6. Km points ──────────────────────────────────────────
  const kmPointsData = [
    { segment: "SEG-AST1-AST2",  km: 0,    name: "Астана-1 (вокзал)",      type: "station",  lat: 51.1284, lng: 71.4304 },
    { segment: "SEG-AST1-AST2",  km: 2.5,  name: "Сигнал Н-1",             type: "signal",   lat: null,    lng: null },
    { segment: "SEG-AST1-AST2",  km: 5,    name: "Астана-2",               type: "station",  lat: 51.1155, lng: 71.4189 },
    { segment: "SEG-AST2-SARY",  km: 10,   name: "Мост через р. Есиль",    type: "bridge",   lat: 51.1050, lng: 71.3900 },
    { segment: "SEG-AST2-SARY",  km: 18,   name: "Сары-Арка",              type: "station",  lat: 51.0960, lng: 71.3600 },
    { segment: "SEG-SARY-AKM",   km: 25,   name: "Разъезд 25 км",          type: "switch",   lat: null,    lng: null },
    { segment: "SEG-SARY-AKM",   km: 40,   name: "Переезд 40 км",          type: "crossing", lat: null,    lng: null },
    { segment: "SEG-SARY-AKM",   km: 55,   name: "Акмол",                  type: "station",  lat: 51.0200, lng: 71.0200 },
    { segment: "SEG-AKM-KSORT",  km: 80,   name: "Разъезд Жана-Есиль",     type: "switch",   lat: null,    lng: null },
    { segment: "SEG-AKM-KSORT",  km: 115,  name: "Мост через р. Нура",     type: "bridge",   lat: null,    lng: null },
    { segment: "SEG-AKM-KSORT",  km: 150,  name: "Сигнал П-150",           type: "signal",   lat: null,    lng: null },
    { segment: "SEG-AKM-KSORT",  km: 200,  name: "Караганда-Сортировочная", type: "station", lat: 49.8350, lng: 73.0890 },
    { segment: "SEG-KSORT-KRGD", km: 210,  name: "Переезд 210 км",         type: "crossing", lat: null,    lng: null },
    { segment: "SEG-KSORT-KRGD", km: 232,  name: "Караганда",              type: "station",  lat: 49.8047, lng: 73.1094 },
  ];
  for (const kp of kmPointsData) {
    await kmPointRepo.save(
      kmPointRepo.create({
        track_segment_id: segments[kp.segment].id,
        km: kp.km,
        name: kp.name,
        type: kp.type,
        latitude: kp.lat,
        longitude: kp.lng,
      })
    );
  }
  console.log("  Km points created:", kmPointsData.length);

  console.log("\nSeed complete!");
  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
