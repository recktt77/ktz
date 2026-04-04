import type { LocomotiveModel } from '@/types';

export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const MAX_CHART_POINTS = 300;
export const MAX_ALERTS = 200;

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const HEARTBEAT_INTERVAL_MS = 15000;
export const HEARTBEAT_TIMEOUT_MS = 5000;

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
  speed_kmh: 'Speed',
  catenary_voltage_kv: 'Catenary Voltage',
  catenary_current_a: 'Catenary Current',
  main_transformer_temp_c: 'Transformer Temp',
  main_transformer_load_pct: 'Transformer Load',
  traction_converter_temp_c: 'Converter Temp',
  traction_converter_load_pct: 'Converter Load',
  tractive_effort_kn: 'Tractive Effort',
  regenerative_braking_power_kw: 'Regen Power',
  energy_consumption_kw: 'Energy Consumption',
  brake_system_pressure_bar: 'Brake Pressure',
  engine_rpm: 'Engine RPM',
  engine_load_pct: 'Engine Load',
  fuel_level_pct: 'Fuel Level',
  fuel_consumption_lph: 'Fuel Consumption',
};

export const ROLE_LABELS: Record<string, string> = {
  driver: 'Driver',
  dispatcher: 'Dispatcher',
  engineer: 'Diagnostic Engineer',
  supervisor: 'Shift Supervisor',
};

export const LOCOMOTIVES = [
  { id: 'KTZ-4021', model: 'KZ8A' as const, label: 'KTZ-4021 (KZ8A)' },
  { id: 'KTZ-7015', model: 'TE33A' as const, label: 'KTZ-7015 (TE33A)' },
];
