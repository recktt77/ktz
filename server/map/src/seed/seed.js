/**
 * Seed script — fills the map schema with realistic KTZ data.
 * Covers major Kazakhstan railway network with real coordinates.
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

  // ── Clean existing data ──────────────────────────────────
  await kmPointRepo.createQueryBuilder().delete().execute();
  await speedLimitRepo.createQueryBuilder().delete().execute();
  await coverageRepo.createQueryBuilder().delete().execute();
  await segmentRepo.createQueryBuilder().delete().execute();
  await stationRepo.createQueryBuilder().delete().execute();
  await railwayRepo.createQueryBuilder().delete().execute();
  console.log("  Old data cleared.");

  // ══════════════════════════════════════════════════════════
  //  1. Railways
  // ══════════════════════════════════════════════════════════

  const railwaysData = [
    { code: "TRANS-KZ-MAIN", name: "Трансказахстанская магистраль", description: "Главный ход Астана — Алматы через Караганду и Шу", total_length_km: 1320 },
    { code: "AST-KRG",       name: "Астана — Караганда",           description: "Целиноградское отделение",                              total_length_km: 230 },
    { code: "KRG-CHU",       name: "Караганда — Шу",               description: "Южный ход через степь",                                  total_length_km: 740 },
    { code: "CHU-ALM",       name: "Шу — Алматы",                  description: "Подход к Алматы через предгорья",                        total_length_km: 350 },
    { code: "AST-PAV",       name: "Астана — Павлодар",             description: "Северо-восточное направление через Экибастуз",           total_length_km: 430 },
    { code: "AST-PET",       name: "Астана — Петропавл",            description: "Северное направление",                                   total_length_km: 500 },
    { code: "AST-KOS",       name: "Астана — Костанай",             description: "Северо-западное направление",                            total_length_km: 750 },
    { code: "CHU-SHY",       name: "Шу — Шымкент",                 description: "Южный ход через Тараз",                                  total_length_km: 550 },
    { code: "SHY-KYZ",       name: "Шымкент — Кызылорда",          description: "Западное направление через Туркестан",                   total_length_km: 480 },
    { code: "KYZ-AKT",       name: "Кызылорда — Актобе",           description: "Транс-Аральский ход",                                    total_length_km: 960 },
    { code: "AKT-ATR",       name: "Актобе — Атырау",              description: "Западное направление к Каспию",                          total_length_km: 600 },
    { code: "PAV-SEM",       name: "Павлодар — Семей",             description: "Восточное направление",                                   total_length_km: 400 },
  ];

  const railways = {};
  for (const rd of railwaysData) {
    const saved = await railwayRepo.save(railwayRepo.create(rd));
    railways[rd.code] = saved;
  }
  console.log("  Railways created:", Object.keys(railways).length);

  // ══════════════════════════════════════════════════════════
  //  2. Stations (real Kazakhstan coordinates)
  // ══════════════════════════════════════════════════════════

  const stationsData = [
    { code: "AST", name: "Astana",      name_kz: "Астана",      lat: 51.1694, lng: 71.4491, type: "hub",      railway: "TRANS-KZ-MAIN", km: 0 },
    { code: "ALM", name: "Almaty",      name_kz: "Алматы",      lat: 43.2370, lng: 76.9457, type: "hub",      railway: "TRANS-KZ-MAIN", km: 1320 },
    { code: "KRG", name: "Karaganda",   name_kz: "Қарағанды",   lat: 49.8047, lng: 73.0856, type: "hub",      railway: "TRANS-KZ-MAIN", km: 230 },
    { code: "AKT", name: "Aktobe",      name_kz: "Ақтөбе",     lat: 50.2839, lng: 57.1668, type: "hub",      railway: "KYZ-AKT",       km: 960 },
    { code: "SHY", name: "Shymkent",    name_kz: "Шымкент",    lat: 42.3154, lng: 68.2581, type: "hub",      railway: "CHU-SHY",       km: 550 },
    { code: "PAV", name: "Pavlodar",    name_kz: "Павлодар",    lat: 52.2873, lng: 76.9674, type: "hub",      railway: "AST-PAV",       km: 430 },
    { code: "SEM", name: "Semey",       name_kz: "Семей",       lat: 50.4111, lng: 80.2275, type: "hub",      railway: "PAV-SEM",       km: 400 },
    { code: "KOS", name: "Kostanay",    name_kz: "Қостанай",    lat: 53.2198, lng: 63.6354, type: "hub",      railway: "AST-KOS",       km: 750 },
    { code: "ATR", name: "Atyrau",      name_kz: "Атырау",      lat: 47.0945, lng: 51.9238, type: "hub",      railway: "AKT-ATR",       km: 600 },
    { code: "PET", name: "Petropavl",   name_kz: "Петропавл",   lat: 54.8753, lng: 69.1462, type: "station",  railway: "AST-PET",       km: 500 },
    { code: "TRK", name: "Turkestan",   name_kz: "Түркістан",   lat: 43.3017, lng: 68.2525, type: "station",  railway: "SHY-KYZ",       km: 120 },
    { code: "KYZ", name: "Kyzylorda",   name_kz: "Қызылорда",   lat: 44.8528, lng: 65.5022, type: "station",  railway: "SHY-KYZ",       km: 480 },
    { code: "CHU", name: "Chu",         name_kz: "Шу",          lat: 43.5964, lng: 73.7544, type: "junction",  railway: "TRANS-KZ-MAIN", km: 970 },
    { code: "ZHZ", name: "Zhezkazgan",  name_kz: "Жезқазған",   lat: 47.7833, lng: 67.7000, type: "station",  railway: "KRG-CHU",       km: 400 },
    { code: "ARS", name: "Arys",        name_kz: "Арыс",        lat: 42.4300, lng: 68.8100, type: "junction",  railway: "CHU-SHY",       km: 480 },
  ];

  const stations = {};
  for (const sd of stationsData) {
    const saved = await stationRepo.save(
      stationRepo.create({
        name: sd.name,
        code: sd.code,
        name_kz: sd.name_kz,
        station_type: sd.type,
        railway_id: railways[sd.railway].id,
        position_km: sd.km,
        latitude: sd.lat,
        longitude: sd.lng,
      })
    );
    stations[sd.code] = saved;
  }
  console.log("  Stations created:", Object.keys(stations).length);

  // ══════════════════════════════════════════════════════════
  //  3. Track segments with waypoints (following real rail corridors)
  // ══════════════════════════════════════════════════════════

  const segmentsData = [
    {
      code: "SEG-AST-ALM", name: "Астана — Алматы",
      railway: "TRANS-KZ-MAIN", from: "AST", to: "ALM",
      start_km: 0, end_km: 1320,
      waypoints: [
        [51.17, 71.45], [50.75, 71.90], [50.30, 72.40], [49.80, 73.09],
        [49.00, 73.20], [48.00, 73.40], [46.80, 73.55],
        [45.50, 73.60], [44.50, 73.68], [43.60, 73.75],
        [43.45, 74.50], [43.35, 75.50], [43.24, 76.95],
      ],
    },
    {
      code: "SEG-AST-KRG", name: "Астана — Қарағанды",
      railway: "AST-KRG", from: "AST", to: "KRG",
      start_km: 0, end_km: 230,
      waypoints: [
        [51.17, 71.45], [50.75, 71.90], [50.30, 72.40], [49.80, 73.09],
      ],
    },
    {
      code: "SEG-KRG-CHU", name: "Қарағанды — Шу",
      railway: "KRG-CHU", from: "KRG", to: "CHU",
      start_km: 0, end_km: 740,
      waypoints: [
        [49.80, 73.09], [49.00, 73.20], [48.00, 73.40],
        [46.80, 73.55], [45.50, 73.60], [44.50, 73.68], [43.60, 73.75],
      ],
    },
    {
      code: "SEG-CHU-ALM", name: "Шу — Алматы",
      railway: "CHU-ALM", from: "CHU", to: "ALM",
      start_km: 0, end_km: 350,
      waypoints: [
        [43.60, 73.75], [43.45, 74.50], [43.35, 75.50], [43.24, 76.95],
      ],
    },
    {
      code: "SEG-AST-PAV", name: "Астана — Павлодар",
      railway: "AST-PAV", from: "AST", to: "PAV",
      start_km: 0, end_km: 430,
      waypoints: [
        [51.17, 71.45], [51.50, 72.50], [51.70, 73.50],
        [51.85, 74.80], [52.00, 75.90], [52.29, 76.97],
      ],
    },
    {
      code: "SEG-AST-PET", name: "Астана — Петропавл",
      railway: "AST-PET", from: "AST", to: "PET",
      start_km: 0, end_km: 500,
      waypoints: [
        [51.17, 71.45], [51.80, 71.00], [52.40, 70.50],
        [53.20, 70.00], [54.00, 69.50], [54.88, 69.15],
      ],
    },
    {
      code: "SEG-AST-KOS", name: "Астана — Қостанай",
      railway: "AST-KOS", from: "AST", to: "KOS",
      start_km: 0, end_km: 750,
      waypoints: [
        [51.17, 71.45], [51.40, 69.80], [51.70, 68.00],
        [52.20, 66.20], [52.80, 64.80], [53.22, 63.64],
      ],
    },
    {
      code: "SEG-CHU-SHY", name: "Шу — Шымкент",
      railway: "CHU-SHY", from: "CHU", to: "SHY",
      start_km: 0, end_km: 550,
      waypoints: [
        [43.60, 73.75], [43.20, 72.50], [42.90, 71.40],
        [42.50, 70.40], [42.45, 69.60], [42.32, 68.26],
      ],
    },
    {
      code: "SEG-SHY-KYZ", name: "Шымкент — Қызылорда",
      railway: "SHY-KYZ", from: "SHY", to: "KYZ",
      start_km: 0, end_km: 480,
      waypoints: [
        [42.32, 68.26], [43.30, 68.25], [43.80, 67.20],
        [44.30, 66.30], [44.85, 65.50],
      ],
    },
    {
      code: "SEG-KYZ-AKT", name: "Қызылорда — Ақтөбе",
      railway: "KYZ-AKT", from: "KYZ", to: "AKT",
      start_km: 0, end_km: 960,
      waypoints: [
        [44.85, 65.50], [45.80, 63.80], [47.00, 61.50],
        [48.20, 59.80], [49.40, 58.30], [50.28, 57.17],
      ],
    },
    {
      code: "SEG-AKT-ATR", name: "Ақтөбе — Атырау",
      railway: "AKT-ATR", from: "AKT", to: "ATR",
      start_km: 0, end_km: 600,
      waypoints: [
        [50.28, 57.17], [49.80, 56.00], [49.20, 54.50],
        [48.50, 53.50], [47.80, 52.70], [47.10, 51.92],
      ],
    },
    {
      code: "SEG-PAV-SEM", name: "Павлодар — Семей",
      railway: "PAV-SEM", from: "PAV", to: "SEM",
      start_km: 0, end_km: 400,
      waypoints: [
        [52.29, 76.97], [51.80, 77.80], [51.20, 78.80],
        [50.80, 79.60], [50.41, 80.23],
      ],
    },
  ];

  const segments = {};
  for (const seg of segmentsData) {
    const saved = await segmentRepo.save(
      segmentRepo.create({
        code: seg.code,
        name: seg.name,
        railway_id: railways[seg.railway].id,
        start_station_id: stations[seg.from].id,
        end_station_id: stations[seg.to].id,
        start_km: seg.start_km,
        end_km: seg.end_km,
        length_km: seg.end_km - seg.start_km,
        waypoints: seg.waypoints,
      })
    );
    segments[seg.code] = saved;
  }
  console.log("  Segments created:", Object.keys(segments).length);

  // ══════════════════════════════════════════════════════════
  //  4. Station track coverage
  // ══════════════════════════════════════════════════════════

  const coveragesData = [
    { station: "AST", segment: "SEG-AST-KRG", km_from: 0,   km_to: 50 },
    { station: "KRG", segment: "SEG-AST-KRG", km_from: 180, km_to: 230 },
    { station: "KRG", segment: "SEG-KRG-CHU", km_from: 0,   km_to: 50 },
    { station: "ZHZ", segment: "SEG-KRG-CHU", km_from: 350, km_to: 450 },
    { station: "CHU", segment: "SEG-KRG-CHU", km_from: 690, km_to: 740 },
    { station: "CHU", segment: "SEG-CHU-ALM", km_from: 0,   km_to: 50 },
    { station: "ALM", segment: "SEG-CHU-ALM", km_from: 300, km_to: 350 },
    { station: "AST", segment: "SEG-AST-PAV", km_from: 0,   km_to: 50 },
    { station: "PAV", segment: "SEG-AST-PAV", km_from: 380, km_to: 430 },
    { station: "AST", segment: "SEG-AST-PET", km_from: 0,   km_to: 50 },
    { station: "PET", segment: "SEG-AST-PET", km_from: 450, km_to: 500 },
    { station: "AST", segment: "SEG-AST-KOS", km_from: 0,   km_to: 50 },
    { station: "KOS", segment: "SEG-AST-KOS", km_from: 700, km_to: 750 },
    { station: "CHU", segment: "SEG-CHU-SHY", km_from: 0,   km_to: 50 },
    { station: "ARS", segment: "SEG-CHU-SHY", km_from: 430, km_to: 530 },
    { station: "SHY", segment: "SEG-CHU-SHY", km_from: 500, km_to: 550 },
    { station: "SHY", segment: "SEG-SHY-KYZ", km_from: 0,   km_to: 50 },
    { station: "TRK", segment: "SEG-SHY-KYZ", km_from: 70,  km_to: 170 },
    { station: "KYZ", segment: "SEG-SHY-KYZ", km_from: 430, km_to: 480 },
    { station: "KYZ", segment: "SEG-KYZ-AKT", km_from: 0,   km_to: 50 },
    { station: "AKT", segment: "SEG-KYZ-AKT", km_from: 910, km_to: 960 },
    { station: "AKT", segment: "SEG-AKT-ATR", km_from: 0,   km_to: 50 },
    { station: "ATR", segment: "SEG-AKT-ATR", km_from: 550, km_to: 600 },
    { station: "PAV", segment: "SEG-PAV-SEM", km_from: 0,   km_to: 50 },
    { station: "SEM", segment: "SEG-PAV-SEM", km_from: 350, km_to: 400 },
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

  // ══════════════════════════════════════════════════════════
  //  5. Speed limits
  // ══════════════════════════════════════════════════════════

  const speedLimitsData = [
    { segment: "SEG-AST-KRG", km_from: 0,   km_to: 10,  max: 60,  reason: "Станционная зона Астана" },
    { segment: "SEG-AST-KRG", km_from: 10,  km_to: 200, max: 140, reason: "Перегон" },
    { segment: "SEG-AST-KRG", km_from: 200, km_to: 230, max: 60,  reason: "Станционная зона Караганда" },
    { segment: "SEG-KRG-CHU", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Караганда" },
    { segment: "SEG-KRG-CHU", km_from: 15,  km_to: 720, max: 120, reason: "Перегон" },
    { segment: "SEG-KRG-CHU", km_from: 720, km_to: 740, max: 60,  reason: "Станционная зона Шу" },
    { segment: "SEG-CHU-ALM", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Шу" },
    { segment: "SEG-CHU-ALM", km_from: 15,  km_to: 300, max: 120, reason: "Перегон" },
    { segment: "SEG-CHU-ALM", km_from: 300, km_to: 350, max: 80,  reason: "Подход к Алматы, кривые" },
    { segment: "SEG-AST-PAV", km_from: 0,   km_to: 10,  max: 60,  reason: "Станционная зона Астана" },
    { segment: "SEG-AST-PAV", km_from: 10,  km_to: 400, max: 140, reason: "Перегон" },
    { segment: "SEG-AST-PAV", km_from: 400, km_to: 430, max: 60,  reason: "Станционная зона Павлодар" },
    { segment: "SEG-AST-PET", km_from: 0,   km_to: 10,  max: 60,  reason: "Станционная зона Астана" },
    { segment: "SEG-AST-PET", km_from: 10,  km_to: 470, max: 120, reason: "Перегон" },
    { segment: "SEG-AST-PET", km_from: 470, km_to: 500, max: 60,  reason: "Станционная зона Петропавл" },
    { segment: "SEG-AST-KOS", km_from: 0,   km_to: 10,  max: 60,  reason: "Станционная зона Астана" },
    { segment: "SEG-AST-KOS", km_from: 10,  km_to: 720, max: 120, reason: "Перегон" },
    { segment: "SEG-AST-KOS", km_from: 720, km_to: 750, max: 60,  reason: "Станционная зона Костанай" },
    { segment: "SEG-CHU-SHY", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Шу" },
    { segment: "SEG-CHU-SHY", km_from: 15,  km_to: 520, max: 120, reason: "Перегон" },
    { segment: "SEG-CHU-SHY", km_from: 520, km_to: 550, max: 60,  reason: "Станционная зона Шымкент" },
    { segment: "SEG-SHY-KYZ", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Шымкент" },
    { segment: "SEG-SHY-KYZ", km_from: 15,  km_to: 450, max: 120, reason: "Перегон" },
    { segment: "SEG-SHY-KYZ", km_from: 450, km_to: 480, max: 60,  reason: "Станционная зона Кызылорда" },
    { segment: "SEG-KYZ-AKT", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Кызылорда" },
    { segment: "SEG-KYZ-AKT", km_from: 15,  km_to: 930, max: 100, reason: "Перегон (Транс-Аральский)" },
    { segment: "SEG-KYZ-AKT", km_from: 930, km_to: 960, max: 60,  reason: "Станционная зона Актобе" },
    { segment: "SEG-AKT-ATR", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Актобе" },
    { segment: "SEG-AKT-ATR", km_from: 15,  km_to: 570, max: 100, reason: "Перегон" },
    { segment: "SEG-AKT-ATR", km_from: 570, km_to: 600, max: 60,  reason: "Станционная зона Атырау" },
    { segment: "SEG-PAV-SEM", km_from: 0,   km_to: 15,  max: 60,  reason: "Станционная зона Павлодар" },
    { segment: "SEG-PAV-SEM", km_from: 15,  km_to: 370, max: 120, reason: "Перегон" },
    { segment: "SEG-PAV-SEM", km_from: 370, km_to: 400, max: 60,  reason: "Станционная зона Семей" },
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

  // ══════════════════════════════════════════════════════════
  //  6. Km points
  // ══════════════════════════════════════════════════════════

  const kmPointsData = [
    { segment: "SEG-AST-KRG", km: 0,   name: "Астана (вокзал)",           type: "station",  lat: 51.1694, lng: 71.4491 },
    { segment: "SEG-AST-KRG", km: 25,  name: "Мост через р. Есиль",       type: "bridge",   lat: null,    lng: null },
    { segment: "SEG-AST-KRG", km: 115, name: "Разъезд Жана-Есиль",        type: "switch",   lat: null,    lng: null },
    { segment: "SEG-AST-KRG", km: 230, name: "Караганда",                 type: "station",  lat: 49.8047, lng: 73.0856 },
    { segment: "SEG-KRG-CHU", km: 0,   name: "Караганда",                 type: "station",  lat: 49.8047, lng: 73.0856 },
    { segment: "SEG-KRG-CHU", km: 370, name: "Мост через р. Сарысу",      type: "bridge",   lat: null,    lng: null },
    { segment: "SEG-KRG-CHU", km: 740, name: "Шу",                        type: "station",  lat: 43.5964, lng: 73.7544 },
    { segment: "SEG-CHU-ALM", km: 0,   name: "Шу",                        type: "station",  lat: 43.5964, lng: 73.7544 },
    { segment: "SEG-CHU-ALM", km: 175, name: "Переезд 175 км",            type: "crossing", lat: null,    lng: null },
    { segment: "SEG-CHU-ALM", km: 350, name: "Алматы-1",                  type: "station",  lat: 43.2370, lng: 76.9457 },
    { segment: "SEG-PAV-SEM", km: 0,   name: "Павлодар",                  type: "station",  lat: 52.2873, lng: 76.9674 },
    { segment: "SEG-PAV-SEM", km: 200, name: "Мост через р. Иртыш",       type: "bridge",   lat: null,    lng: null },
    { segment: "SEG-PAV-SEM", km: 400, name: "Семей",                     type: "station",  lat: 50.4111, lng: 80.2275 },
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
