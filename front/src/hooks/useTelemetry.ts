import { useMemo } from 'react';
import { useDashboardStore } from '@/store';
import type { LocomotiveTelemetry, LocomotiveProcessed, TelemetryPoint, AlertItem } from '@/types';

const EMPTY_HISTORY: TelemetryPoint[] = [];

/** Get typed telemetry for a specific locomotive */
export function useTelemetry(locoId: string | null): LocomotiveTelemetry | null {
  return useDashboardStore((s) => (locoId ? s.telemetry[locoId] ?? null : null));
}

/** Get processed analytics for a specific locomotive */
export function useProcessed(locoId: string | null): LocomotiveProcessed | null {
  return useDashboardStore((s) => (locoId ? s.processed[locoId] ?? null : null));
}

/** Get chart history for a specific metric of a locomotive */
export function useChartHistory(locoId: string | null, metric: string): TelemetryPoint[] {
  const key = locoId ? `${locoId}:${metric}` : '';
  return useDashboardStore((s) => s.chartHistory[key]) ?? EMPTY_HISTORY;
}

/** Get alerts filtered by locomotive (null = all) */
export function useLocomotiveAlerts(locoId: string | null): AlertItem[] {
  const allAlerts = useDashboardStore((s) => s.alerts);
  return useMemo(
    () => (locoId ? allAlerts.filter((a) => a.locomotive_id === locoId) : allAlerts),
    [allAlerts, locoId],
  );
}

/** Get the selected locomotive ID */
export function useSelectedLocomotive(): string | null {
  return useDashboardStore((s) => s.selectedLocomotiveId);
}

/** Get the selected locomotive's model from its telemetry */
export function useSelectedLocoModel(): 'KZ8A' | 'TE33A' | null {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  return useDashboardStore((s) => {
    if (!locoId) return null;
    return s.telemetry[locoId]?.locomotive_model ?? null;
  });
}
