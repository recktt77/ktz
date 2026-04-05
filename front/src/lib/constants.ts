import type { LocomotiveModel } from '@/types';

/**
 * Resolve WebSocket base URL.
 * If VITE_WS_URL is set, always use it (dev or staging).
 * In production (served via nginx with no env override), auto-detect from page URL.
 */
function resolveWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL;
  if (env) return env;
  // Auto-detect from page URL (production behind nginx)
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return 'ws://localhost:8086';
}

export const WS_URL = resolveWsUrl();

/** Whether to use mock data stream instead of real backend WebSocket */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Backend service base URLs (defaults for dev without API Gateway)
export const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8081';
export const MAP_API_URL = import.meta.env.VITE_MAP_API_URL || 'http://localhost:8082';
export const LOCOMOTIVE_API_URL = import.meta.env.VITE_LOCOMOTIVE_API_URL || 'http://localhost:8083';
export const NORMALIZATION_API_URL = import.meta.env.VITE_NORMALIZATION_API_URL || 'http://localhost:8085';

export const MAX_CHART_POINTS = 300;
export const MAX_ALERTS = 200;

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const HEARTBEAT_INTERVAL_MS = 15000;
export const HEARTBEAT_TIMEOUT_MS = 5000;
export const POLL_INTERVAL_MS = 2000;
export const WS_FALLBACK_ATTEMPTS = 3;

/**
 * Backend WebSocket channel paths (Normalization Service).
 * Used when connecting to the backend WebSocket.
 *   /ws/live                        — raw live stream
 *   /ws/driver/{locomotiveId}       — driver role view
 *   /ws/dispatcher                  — dispatcher fleet view
 *   /ws/engineer/{locomotiveId}     — engineer diagnostics
 *   /ws/supervisor                  — supervisor fleet summary
 */
export function getWsChannelUrl(role: string, locomotiveId?: string): string {
  const base = WS_URL.replace(/\/ws\/?$/, '');
  switch (role) {
    case 'driver':
      return locomotiveId ? `${base}/ws/driver/${locomotiveId}` : `${base}/ws/driver`;
    case 'dispatcher':
      return `${base}/ws/dispatcher`;
    case 'engineer':
      return locomotiveId ? `${base}/ws/engineer/${locomotiveId}` : `${base}/ws/engineer`;
    case 'supervisor':
      return `${base}/ws/supervisor`;
    case 'admin':
      // Admin sees all locomotives — subscribe to dispatcher (fleet) view
      return `${base}/ws/dispatcher`;
    default:
      return `${base}/ws/live`;
  }
}

/**
 * HTTP polling fallback URL (when WebSocket is blocked by proxy).
 * Uses the same gateway as AUTH_API_URL → /poll/:role/:locomotiveId
 */
export function getPollChannelUrl(role: string, locomotiveId?: string): string {
  const base = AUTH_API_URL.replace(/\/+$/, '');
  switch (role) {
    case 'driver':
      return locomotiveId ? `${base}/poll/driver/${locomotiveId}` : `${base}/poll/driver`;
    case 'dispatcher':
      return `${base}/poll/dispatcher`;
    case 'engineer':
      return locomotiveId ? `${base}/poll/engineer/${locomotiveId}` : `${base}/poll/engineer`;
    case 'supervisor':
      return `${base}/poll/supervisor`;
    default:
      return `${base}/poll/live`;
  }
}

/** Which numeric fields to track in chart history, per model */
export const CHART_METRICS: Record<LocomotiveModel, string[]> = {
  KZ8A: [
    'speed_kmh',
    'catenary_voltage_kv',
    'catenary_current_a',
    'main_transformer_temp_c',
    'traction_converter_temp_c',
    'tractive_effort_kn',
    'regenerative_braking_power_kw',
    'energy_consumption_kw',
    'brake_system_pressure_bar',
  ],
  TE33A: [
    'speed_kmh',
    'engine_rpm',
    'engine_load_pct',
    'fuel_level_pct',
    'fuel_consumption_lph',
    'brake_system_pressure_bar',
  ],
};

export const METRIC_UNITS: Record<string, string> = {
  speed_kmh: 'km/h',
  catenary_voltage_kv: 'kV',
  catenary_current_a: 'A',
  main_transformer_temp_c: '°C',
  main_transformer_load_pct: '%',
  traction_converter_temp_c: '°C',
  traction_converter_load_pct: '%',
  tractive_effort_kn: 'kN',
  regenerative_braking_power_kw: 'kW',
  energy_meter_kwh: 'kWh',
  energy_consumption_kw: 'kW',
  brake_system_pressure_bar: 'bar',
  engine_rpm: 'RPM',
  engine_load_pct: '%',
  fuel_level_pct: '%',
  fuel_consumption_lph: 'L/h',
};

export const METRIC_LABELS: Record<string, string> = {
  speed_kmh: 'Скорость',
  catenary_voltage_kv: 'Напряжение сети',
  catenary_current_a: 'Ток контактной сети',
  main_transformer_temp_c: 'Темп. трансформатора',
  main_transformer_load_pct: 'Нагрузка трансформатора',
  traction_converter_temp_c: 'Темп. конвертера',
  traction_converter_load_pct: 'Нагрузка конвертера',
  tractive_effort_kn: 'Тяговое усилие',
  regenerative_braking_power_kw: 'Рекуперация',
  energy_meter_kwh: 'Счётчик энергии',
  energy_consumption_kw: 'Потребление энергии',
  brake_system_pressure_bar: 'Давление тормозов',
  engine_rpm: 'Обороты двигателя',
  engine_load_pct: 'Нагрузка двигателя',
  fuel_level_pct: 'Уровень топлива',
  fuel_consumption_lph: 'Расход топлива',
};

export const ROLE_LABELS: Record<string, string> = {
  driver: 'Машинист',
  dispatcher: 'Диспетчер',
  engineer: 'Инженер-диагност',
  supervisor: 'Руководитель смены',
  admin: 'Администратор',
};

export const LOCOMOTIVES = [
  { id: 'KTZ-4021', model: 'KZ8A' as const, label: 'KTZ-4021 (KZ8A)' },
  { id: 'KTZ-7015', model: 'TE33A' as const, label: 'KTZ-7015 (TE33A)' },
];
