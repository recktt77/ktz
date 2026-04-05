import { useEffect, useRef, useCallback } from 'react';
import { WebSocketClient } from '@/services/ws/WebSocketClient';
import { routeMessageBatch } from '@/services/ws/messageRouter';
import { useDashboardStore } from '@/store';
import {
  getWsChannelUrl,
  getPollChannelUrl,
  WS_FALLBACK_ATTEMPTS,
  POLL_INTERVAL_MS,
} from '@/lib/constants';

export function useWebSocket(): void {
  const setConnectionStatus = useDashboardStore((s) => s.setConnectionStatus);
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const selectedLocomotiveId = useDashboardStore((s) => s.selectedLocomotiveId);
  const wsRef = useRef<WebSocketClient | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);
  const pollingActiveRef = useRef(false);
  const firstPollRef = useRef(true);

  const startPolling = useCallback(
    (pollUrl: string) => {
      if (pollingActiveRef.current) return;
      pollingActiveRef.current = true;
      firstPollRef.current = true;
      console.log('[Poll] Falling back to HTTP polling:', pollUrl);
      setConnectionStatus('connected');

      const poll = async () => {
        try {
          const res = await fetch(pollUrl);
          if (!res.ok) return;
          const data = await res.json();
          if (data?.type !== 'snapshot_init' || !data.payload?.locomotives) return;

          if (firstPollRef.current) {
            // First poll — full snapshot to seed the store
            firstPollRef.current = false;
            routeMessageBatch([{ type: 'snapshot_init', payload: data.payload }]);
          } else {
            // Subsequent polls — incremental updates (preserves chart history)
            const messages: Array<{ type: 'telemetry_update'; payload: unknown } | { type: 'processed_update'; payload: unknown } | { type: 'route_context_update'; payload: unknown }> = [];
            for (const loco of data.payload.locomotives) {
              messages.push({ type: 'telemetry_update', payload: loco.telemetry });
              messages.push({ type: 'processed_update', payload: loco.processed });
              if (loco.route) {
                messages.push({ type: 'route_context_update', payload: loco.route });
              }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            routeMessageBatch(messages as any);
          }
        } catch {
          // silent — will retry on next interval
        }
      };

      poll(); // immediate first fetch
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [setConnectionStatus],
  );

  useEffect(() => {
    const wsUrl = getWsChannelUrl(selectedRole, selectedLocomotiveId ?? undefined);
    const pollUrl = getPollChannelUrl(selectedRole, selectedLocomotiveId ?? undefined);

    failCountRef.current = 0;
    pollingActiveRef.current = false;

    const statusCallback = (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => {
      if (status === 'reconnecting') {
        failCountRef.current++;
        if (failCountRef.current >= WS_FALLBACK_ATTEMPTS && !pollingActiveRef.current) {
          // WS failed too many times — switch to polling
          wsRef.current?.destroy();
          wsRef.current = null;
          startPolling(pollUrl);
          return;
        }
      }
      if (status === 'connected') {
        failCountRef.current = 0;
      }
      if (!pollingActiveRef.current) {
        setConnectionStatus(status);
      }
    };

    const client = new WebSocketClient(routeMessageBatch, statusCallback, wsUrl);
    wsRef.current = client;
    client.connect();

    return () => {
      client.destroy();
      wsRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      pollingActiveRef.current = false;
    };
  }, [setConnectionStatus, selectedRole, selectedLocomotiveId, startPolling]);
}
