import { useEffect, useRef } from 'react';
import { WebSocketClient } from '@/services/ws/WebSocketClient';
import { MockStreamManager } from '@/services/mock/MockStreamManager';
import { routeMessageBatch } from '@/services/ws/messageRouter';
import { useDashboardStore } from '@/store';
import { USE_MOCK, getWsChannelUrl } from '@/lib/constants';

export function useWebSocket(): void {
  const setConnectionStatus = useDashboardStore((s) => s.setConnectionStatus);
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const selectedLocomotiveId = useDashboardStore((s) => s.selectedLocomotiveId);
  const wsRef = useRef<WebSocketClient | null>(null);
  const mockRef = useRef<MockStreamManager | null>(null);

  useEffect(() => {
    if (USE_MOCK) {
      setConnectionStatus('connected');
      const mock = new MockStreamManager();
      mockRef.current = mock;
      mock.onFlush(routeMessageBatch);
      mock.start();

      return () => {
        mock.stop();
        mockRef.current = null;
      };
    }

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
