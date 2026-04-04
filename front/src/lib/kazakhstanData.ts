import type { MapStationNode, MapRouteDefinition, FleetMapItem } from '@/types/railwayMap';

// ══════════════════════════════════════════════════════════════
//  Real Kazakhstan railway stations (actual coordinates)
// ══════════════════════════════════════════════════════════════

export const STATIONS: MapStationNode[] = [
  { id: 'AST', name: 'Astana',      nameKz: 'Астана',      latitude: 51.1694, longitude: 71.4491, type: 'hub' },
  { id: 'ALM', name: 'Almaty',      nameKz: 'Алматы',      latitude: 43.2370, longitude: 76.9457, type: 'hub' },
  { id: 'KRG', name: 'Karaganda',   nameKz: 'Қарағанды',   latitude: 49.8047, longitude: 73.0856, type: 'hub' },
  { id: 'AKT', name: 'Aktobe',      nameKz: 'Ақтөбе',      latitude: 50.2839, longitude: 57.1668, type: 'hub' },
  { id: 'SHY', name: 'Shymkent',    nameKz: 'Шымкент',     latitude: 42.3154, longitude: 68.2581, type: 'hub' },
  { id: 'PAV', name: 'Pavlodar',    nameKz: 'Павлодар',     latitude: 52.2873, longitude: 76.9674, type: 'hub' },
  { id: 'SEM', name: 'Semey',       nameKz: 'Семей',       latitude: 50.4111, longitude: 80.2275, type: 'hub' },
  { id: 'KOS', name: 'Kostanay',    nameKz: 'Қостанай',    latitude: 53.2198, longitude: 63.6354, type: 'hub' },
  { id: 'ATR', name: 'Atyrau',      nameKz: 'Атырау',      latitude: 47.0945, longitude: 51.9238, type: 'hub' },
  { id: 'PET', name: 'Petropavl',   nameKz: 'Петропавл',   latitude: 54.8753, longitude: 69.1462, type: 'station' },
  { id: 'TRK', name: 'Turkestan',   nameKz: 'Түркістан',   latitude: 43.3017, longitude: 68.2525, type: 'station' },
  { id: 'KYZ', name: 'Kyzylorda',   nameKz: 'Қызылорда',   latitude: 44.8528, longitude: 65.5022, type: 'station' },
  { id: 'CHU', name: 'Chu',         nameKz: 'Шу',          latitude: 43.5964, longitude: 73.7544, type: 'junction' },
  { id: 'ZHZ', name: 'Zhezkazgan',  nameKz: 'Жезқазған',   latitude: 47.7833, longitude: 67.7000, type: 'station' },
  { id: 'ARS', name: 'Arys',        nameKz: 'Арыс',        latitude: 42.4300, longitude: 68.8100, type: 'junction' },
];

// ══════════════════════════════════════════════════════════════
//  Railway routes with waypoints (following real rail corridors)
// ══════════════════════════════════════════════════════════════

export const ROUTES: MapRouteDefinition[] = [
  // ── Main Trans-Kazakhstan backbone: Astana → Almaty (via Karaganda, Chu) ──
  {
    id: 'AST-ALM',
    from_station_id: 'AST',
    to_station_id: 'ALM',
    name: 'Астана — Алматы',
    distance_km: 1320,
    waypoints: [
      [51.17, 71.45], [50.75, 71.90], [50.30, 72.40], [49.80, 73.09], // AST→KRG
      [49.00, 73.20], [48.00, 73.40], [46.80, 73.55],                 // KRG→CHU
      [45.50, 73.60], [44.50, 73.68], [43.60, 73.75],                 // ...→CHU
      [43.45, 74.50], [43.35, 75.50], [43.24, 76.95],                 // CHU→ALM
    ],
  },

  // ── Astana ↔ Karaganda ──
  {
    id: 'AST-KRG',
    from_station_id: 'AST',
    to_station_id: 'KRG',
    name: 'Астана — Қарағанды',
    distance_km: 230,
    waypoints: [
      [51.17, 71.45], [50.75, 71.90], [50.30, 72.40], [49.80, 73.09],
    ],
  },

  // ── Karaganda ↔ Chu ──
  {
    id: 'KRG-CHU',
    from_station_id: 'KRG',
    to_station_id: 'CHU',
    name: 'Қарағанды — Шу',
    distance_km: 740,
    waypoints: [
      [49.80, 73.09], [49.00, 73.20], [48.00, 73.40],
      [46.80, 73.55], [45.50, 73.60], [44.50, 73.68], [43.60, 73.75],
    ],
  },

  // ── Chu ↔ Almaty ──
  {
    id: 'CHU-ALM',
    from_station_id: 'CHU',
    to_station_id: 'ALM',
    name: 'Шу — Алматы',
    distance_km: 350,
    waypoints: [
      [43.60, 73.75], [43.45, 74.50], [43.35, 75.50], [43.24, 76.95],
    ],
  },

  // ── Astana → Pavlodar (northeast, via Ekibastuz corridor) ──
  {
    id: 'AST-PAV',
    from_station_id: 'AST',
    to_station_id: 'PAV',
    name: 'Астана — Павлодар',
    distance_km: 430,
    waypoints: [
      [51.17, 71.45], [51.50, 72.50], [51.70, 73.50],
      [51.85, 74.80], [52.00, 75.90], [52.29, 76.97],
    ],
  },

  // ── Astana → Petropavl (north) ──
  {
    id: 'AST-PET',
    from_station_id: 'AST',
    to_station_id: 'PET',
    name: 'Астана — Петропавл',
    distance_km: 500,
    waypoints: [
      [51.17, 71.45], [51.80, 71.00], [52.40, 70.50],
      [53.20, 70.00], [54.00, 69.50], [54.88, 69.15],
    ],
  },

  // ── Astana → Kostanay (northwest) ──
  {
    id: 'AST-KOS',
    from_station_id: 'AST',
    to_station_id: 'KOS',
    name: 'Астана — Қостанай',
    distance_km: 750,
    waypoints: [
      [51.17, 71.45], [51.40, 69.80], [51.70, 68.00],
      [52.20, 66.20], [52.80, 64.80], [53.22, 63.64],
    ],
  },

  // ── Chu → Shymkent (southwest via Taraz) ──
  {
    id: 'CHU-SHY',
    from_station_id: 'CHU',
    to_station_id: 'SHY',
    name: 'Шу — Шымкент',
    distance_km: 550,
    waypoints: [
      [43.60, 73.75], [43.20, 72.50], [42.90, 71.40],
      [42.50, 70.40], [42.45, 69.60], [42.32, 68.26],
    ],
  },

  // ── Shymkent → Kyzylorda (northwest via Turkestan) ──
  {
    id: 'SHY-KYZ',
    from_station_id: 'SHY',
    to_station_id: 'KYZ',
    name: 'Шымкент — Қызылорда',
    distance_km: 480,
    waypoints: [
      [42.32, 68.26], [43.30, 68.25], [43.80, 67.20],
      [44.30, 66.30], [44.85, 65.50],
    ],
  },

  // ── Kyzylorda → Aktobe (Trans-Aral northwest) ──
  {
    id: 'KYZ-AKT',
    from_station_id: 'KYZ',
    to_station_id: 'AKT',
    name: 'Қызылорда — Ақтөбе',
    distance_km: 960,
    waypoints: [
      [44.85, 65.50], [45.80, 63.80], [47.00, 61.50],
      [48.20, 59.80], [49.40, 58.30], [50.28, 57.17],
    ],
  },

  // ── Aktobe → Atyrau (west to Caspian) ──
  {
    id: 'AKT-ATR',
    from_station_id: 'AKT',
    to_station_id: 'ATR',
    name: 'Ақтөбе — Атырау',
    distance_km: 600,
    waypoints: [
      [50.28, 57.17], [49.80, 56.00], [49.20, 54.50],
      [48.50, 53.50], [47.80, 52.70], [47.10, 51.92],
    ],
  },

  // ── Pavlodar → Semey (southeast) ──
  {
    id: 'PAV-SEM',
    from_station_id: 'PAV',
    to_station_id: 'SEM',
    name: 'Павлодар — Семей',
    distance_km: 400,
    waypoints: [
      [52.29, 76.97], [51.80, 77.80], [51.20, 78.80],
      [50.80, 79.60], [50.41, 80.23],
    ],
  },
];

// ══════════════════════════════════════════════════════════════
//  Ghost fleet — additional locomotives for map visual density
//  These supplement the 2 live-streamed locomotives (KTZ-4021, KTZ-7015)
// ══════════════════════════════════════════════════════════════

export interface GhostLocomotive {
  locomotive_id: string;
  locomotive_model: 'KZ8A' | 'TE33A';
  route_id: string;
  from_station: string;
  to_station: string;
  initial_progress: number;
  speed_factor: number; // relative speed for drift animation
  health_index: number;
  communication_status: 'online' | 'degraded' | 'offline';
}

export const GHOST_FLEET: GhostLocomotive[] = [
  {
    locomotive_id: 'KTZ-2048',
    locomotive_model: 'KZ8A',
    route_id: 'PAV-SEM',
    from_station: 'Pavlodar',
    to_station: 'Semey',
    initial_progress: 0.40,
    speed_factor: 0.7,
    health_index: 92,
    communication_status: 'online',
  },
  {
    locomotive_id: 'KTZ-3091',
    locomotive_model: 'TE33A',
    route_id: 'AKT-ATR',
    from_station: 'Aktobe',
    to_station: 'Atyrau',
    initial_progress: 0.65,
    speed_factor: 0.5,
    health_index: 68,
    communication_status: 'online',
  },
  {
    locomotive_id: 'KTZ-5017',
    locomotive_model: 'KZ8A',
    route_id: 'CHU-SHY',
    from_station: 'Chu',
    to_station: 'Shymkent',
    initial_progress: 0.25,
    speed_factor: 0.8,
    health_index: 85,
    communication_status: 'online',
  },
  {
    locomotive_id: 'KTZ-6003',
    locomotive_model: 'TE33A',
    route_id: 'KYZ-AKT',
    from_station: 'Kyzylorda',
    to_station: 'Aktobe',
    initial_progress: 0.55,
    speed_factor: 0.6,
    health_index: 42,
    communication_status: 'degraded',
  },
];

// ══════════════════════════════════════════════════════════════
//  Lookup helpers
// ══════════════════════════════════════════════════════════════

const stationByName = new Map<string, MapStationNode>();
for (const s of STATIONS) {
  stationByName.set(s.name.toLowerCase(), s);
  stationByName.set(s.nameKz.toLowerCase(), s);
}

const routeByStationPair = new Map<string, MapRouteDefinition>();
for (const r of ROUTES) {
  const from = STATIONS.find((s) => s.id === r.from_station_id);
  const to = STATIONS.find((s) => s.id === r.to_station_id);
  if (from && to) {
    routeByStationPair.set(`${from.name.toLowerCase()}->${to.name.toLowerCase()}`, r);
    routeByStationPair.set(`${from.nameKz.toLowerCase()}->${to.nameKz.toLowerCase()}`, r);
  }
}

/** Find a route by station names. Returns { route, reversed } */
export function findRoute(
  fromName: string,
  toName: string,
): { route: MapRouteDefinition; reversed: boolean } | null {
  const keyFwd = `${fromName.toLowerCase()}->${toName.toLowerCase()}`;
  const fwd = routeByStationPair.get(keyFwd);
  if (fwd) return { route: fwd, reversed: false };

  const keyRev = `${toName.toLowerCase()}->${fromName.toLowerCase()}`;
  const rev = routeByStationPair.get(keyRev);
  if (rev) return { route: rev, reversed: true };

  return null;
}

export function findRouteById(routeId: string): MapRouteDefinition | undefined {
  return ROUTES.find((r) => r.id === routeId);
}

export function findStation(name: string): MapStationNode | undefined {
  return stationByName.get(name.toLowerCase());
}
