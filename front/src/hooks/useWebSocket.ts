import { useEffect, useRef } from 'react';
import { WebSocketClient } from '@/services/ws/WebSocketClient';
import { routeMessageBatch } from '@/services/ws/messageRouter';
import { useDashboardStore } from '@/store';
import { getWsChannelUrl } from '@/lib/constants';

export function useWebSocket(): void {
  const setConnectionStatus = useDashboardStore((s) => s.setConnectionStatus);
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const selectedLocomotiveId = useDashboardStore((s) => s.selectedLocomotiveId);
  const wsRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Build path-based WebSocket URL for the current role
    const wsUrl = getWsChannelUrl(selectedRole, selectedLocomotiveId ?? undefined);

    const client = new WebSocketClient(routeMessageBatch, setConnectionStatus, wsUrl);
    wsRef.current = client;
    client.connect();

    return () => {
      client.destroy();
      wsRef.current = null;
    };
  }, [setConnectionStatus, selectedRole, selectedLocomotiveId]);
}
