/**
 * Locomotive Service API client.
 * Maps to Locomotive Service endpoints (GET /locomotives, POST /telemetry/raw, etc.)
 */
import { createApiClient } from './client';
import { LOCOMOTIVE_API_URL } from '@/lib/constants';
import type { LocomotiveModel } from '@/types';

const api = createApiClient(LOCOMOTIVE_API_URL);

// ──── Locomotive types ────

export interface LocomotiveRecord {
  id: string;
  model: LocomotiveModel;
  serial_number: string;
  name: string;
  status: 'active' | 'maintenance' | 'retired';
  track_segment_id: string | null;
  position_km: number | null;
  created_at: string;
}

export interface MetricSchema {
  model: LocomotiveModel;
  fields: {
    name: string;
    type: 'number' | 'string' | 'enum';
    unit?: string;
    min?: number;
    max?: number;
    enum_values?: string[];
  }[];
}

// ──── CRUD ────

export async function getLocomotives(): Promise<LocomotiveRecord[]> {
  return api.get<LocomotiveRecord[]>('/locomotives');
}

export async function getLocomotive(id: string): Promise<LocomotiveRecord> {
  return api.get<LocomotiveRecord>(`/locomotives/${encodeURIComponent(id)}`);
}

export async function createLocomotive(data: Omit<LocomotiveRecord, 'id' | 'created_at'>): Promise<LocomotiveRecord> {
  return api.post<LocomotiveRecord>('/locomotives', data);
}

export async function updateLocomotive(id: string, data: Partial<LocomotiveRecord>): Promise<LocomotiveRecord> {
  return api.patch<LocomotiveRecord>(`/locomotives/${encodeURIComponent(id)}`, data);
}

// ──── Models & schemas ────

export async function getModels(): Promise<{ model: LocomotiveModel; name: string }[]> {
  return api.get('/models');
}

export async function getModelSchema(model: LocomotiveModel): Promise<MetricSchema> {
  return api.get<MetricSchema>(`/models/${encodeURIComponent(model)}/schema`);
}

// ──── Raw telemetry (read) ────

export async function getRawTelemetry(
  locomotiveId: string,
  params?: { from?: string; to?: string; limit?: number },
): Promise<unknown[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return api.get(`/telemetry/raw/${encodeURIComponent(locomotiveId)}${qs ? `?${qs}` : ''}`);
}
