/**
 * Normalization Service API client.
 * Maps to Normalization Service REST endpoints for history, replay, role-views, thresholds.
 */
import { createApiClient } from './client';
import { NORMALIZATION_API_URL } from '@/lib/constants';
import type { LocomotiveProcessed, UserRole } from '@/types';

const api = createApiClient(NORMALIZATION_API_URL);

// ──── Health index ────

export async function getHealthIndex(locomotiveId: string): Promise<{
  locomotive_id: string;
  health_index: number;
  health_status: string;
  timestamp_utc: string;
}> {
  return api.get(`/health-index/${encodeURIComponent(locomotiveId)}`);
}

// ──── Snapshots ────

export async function getSnapshot(locomotiveId: string): Promise<LocomotiveProcessed> {
  return api.get(`/snapshots/${encodeURIComponent(locomotiveId)}`);
}

// ──── History ────

export async function getHistory(
  locomotiveId: string,
  params?: { from?: string; to?: string; limit?: number },
): Promise<LocomotiveProcessed[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return api.get(`/history/${encodeURIComponent(locomotiveId)}${qs ? `?${qs}` : ''}`);
}

// ──── Replay (last 5–15 min) ────

export async function getReplay(
  locomotiveId: string,
  minutes: number = 5,
): Promise<LocomotiveProcessed[]> {
  return api.get(`/replay/${encodeURIComponent(locomotiveId)}?minutes=${minutes}`);
}

// ──── Role-based views ────

export async function getRoleView(
  role: UserRole,
  locomotiveId: string,
): Promise<unknown> {
  return api.get(`/role-view/${role}/${encodeURIComponent(locomotiveId)}`);
}

// ──── Thresholds & weights config ────

export interface ThresholdConfig {
  [metric: string]: {
    warning: number;
    critical: number;
  };
}

export interface WeightConfig {
  [factor: string]: number;
}

export async function getThresholds(): Promise<ThresholdConfig> {
  return api.get<ThresholdConfig>('/thresholds');
}

export async function updateThresholds(thresholds: Partial<ThresholdConfig>): Promise<ThresholdConfig> {
  return api.patch<ThresholdConfig>('/thresholds', thresholds);
}

export async function getWeights(): Promise<WeightConfig> {
  return api.get<WeightConfig>('/weights');
}

export async function updateWeights(weights: Partial<WeightConfig>): Promise<WeightConfig> {
  return api.patch<WeightConfig>('/weights', weights);
}
