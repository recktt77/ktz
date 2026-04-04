import type { ValidatedWSMessage } from './schemas';
import { useDashboardStore } from '@/store';
import { CHART_METRICS, MAX_CHART_POINTS } from '@/lib/constants';
import { appendToRingBuffer } from '@/lib/ringBuffer';
import type { TelemetryPoint, LocomotiveTelemetry } from '@/types';

/**
 * Process a batch of validated WS messages and apply to the store.
 * Called once per animation frame with all messages received since last frame.
 */
export function routeMessageBatch(messages: ValidatedWSMessage[]): void {
  const store = useDashboardStore.getState();

  let chartHistoryDirty = false;
  const chartHistoryUpdates: Record<string, TelemetryPoint[]> = {};

  for (const msg of messages) {
    switch (msg.type) {
      case 'snapshot_init':
        store.applySnapshot(msg.payload);
        break;

      case 'telemetry_update':
        store.updateTelemetry(msg.payload);
        appendChartPoints(msg.payload, chartHistoryUpdates, store.chartHistory);
        chartHistoryDirty = true;
        break;

      case 'processed_update':
        store.updateProcessed(msg.payload);
        break;

      case 'alert_created':
        store.addAlert(msg.payload);
        break;

      case 'alert_resolved':
        store.resolveAlert(msg.payload.id);
        break;

      case 'route_context_update':
        store.updateRoute(msg.payload);
        break;

      case 'dispatcher_overlay_update':
        store.updateDispatcherOverlay(msg.payload);
        break;

      case 'fleet_summary_update':
        store.updateFleet(msg.payload);
        break;

      case 'locomotive_status_update':
        // Status text update — no special store action needed yet
        break;
    }
  }

  if (chartHistoryDirty) {
    store.batchUpdateChartHistory(chartHistoryUpdates);
  }

  store.touchLastMessage();
}

function appendChartPoints(
  telemetry: LocomotiveTelemetry,
  updates: Record<string, TelemetryPoint[]>,
  existingHistory: Record<string, TelemetryPoint[]>,
): void {
  const model = telemetry.locomotive_model;
  const locoId = telemetry.locomotive_id;
  const ts = new Date(telemetry.timestamp_utc).getTime();
  const metricsToTrack = CHART_METRICS[model];

  for (const metric of metricsToTrack) {
    const value = (telemetry as unknown as Record<string, unknown>)[metric];
    if (typeof value !== 'number') continue;

    const key = `${locoId}:${metric}`;
    const existing = updates[key] ?? existingHistory[key] ?? [];
    updates[key] = appendToRingBuffer(
      existing,
      { timestamp: ts, value },
      MAX_CHART_POINTS,
    );
  }
}
