import { AUTH_API_URL } from '@/lib/constants';

const BASE = `${AUTH_API_URL}/simulator`;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Status ── */
export interface SimulatorStatus {
  state: 'idle' | 'running' | 'paused';
  scenario: string | null;
  tick: number;
  uptime: number;
  kz8a: { locomotiveId: string };
  te33a: { locomotiveId: string };
}

export function getStatus() {
  return request<SimulatorStatus>(`${BASE}/status`);
}

/* ── Controls ── */
export function start() {
  return request<{ message: string; status: SimulatorStatus }>(`${BASE}/start`, { method: 'POST' });
}
export function stop() {
  return request<{ message: string; status: SimulatorStatus }>(`${BASE}/stop`, { method: 'POST' });
}
export function pause() {
  return request<{ message: string; status: SimulatorStatus }>(`${BASE}/pause`, { method: 'POST' });
}
export function resume() {
  return request<{ message: string; status: SimulatorStatus }>(`${BASE}/resume`, { method: 'POST' });
}

/* ── Scenarios ── */
export interface Scenario {
  id: string;
  label: string;
}

export function getScenarios() {
  return request<Scenario[]>(`${BASE}/scenarios`);
}

export function setScenario(scenario: string) {
  return request<{ message: string; status: SimulatorStatus }>(`${BASE}/scenario`, {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });
}

/* ── Overrides ── */
export interface OverrideParams {
  kz8a: string[];
  te33a: string[];
}

export function getParams() {
  return request<OverrideParams>(`${BASE}/params`);
}

export interface Overrides {
  kz8a: Record<string, number>;
  te33a: Record<string, number>;
}

export function getOverrides() {
  return request<Overrides>(`${BASE}/overrides`);
}

export function setOverride(locomotive: 'kz8a' | 'te33a' | 'all', overrides: Record<string, number>) {
  return request<{ message: string; overrides: Overrides }>(`${BASE}/override`, {
    method: 'POST',
    body: JSON.stringify({ locomotive, overrides }),
  });
}

export function clearOverride(locomotive: 'kz8a' | 'te33a' | 'all') {
  return request<{ message: string; overrides: Overrides }>(`${BASE}/override/${locomotive}`, {
    method: 'DELETE',
  });
}
