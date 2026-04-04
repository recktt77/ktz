import type { ValidatedWSMessage } from './schemas';
import { wsMessageSchema } from './schemas';
import {
  WS_URL,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from '@/lib/constants';

type StatusCallback = (
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
) => void;

type FlushCallback = (messages: ValidatedWSMessage[]) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onStatusChange: StatusCallback;
  private flushCallback: FlushCallback;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  // RAF batch buffer
  private buffer: ValidatedWSMessage[] = [];
  private rafId: ReturnType<typeof requestAnimationFrame> | null = null;

  constructor(
    onFlush: FlushCallback,
    onStatusChange: StatusCallback,
    url: string = WS_URL,
  ) {
    this.flushCallback = onFlush;
    this.onStatusChange = onStatusChange;
    this.url = url;
  }

  connect(): void {
    if (this.destroyed) return;
    this.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.onStatusChange('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch {
        return;
      }

      const result = wsMessageSchema.safeParse(raw);
      if (!result.success) {
        console.warn('[WS] Invalid message dropped:', result.error.issues);
        return;
      }

      const msg = result.data;

      if (msg.type === 'pong') {
        this.handlePong();
        return;
      }

      this.buffer.push(msg);
      this.scheduleFlush();
    };

    this.ws.onclose = () => {
      this.cleanup();
      if (!this.destroyed) {
        this.onStatusChange('reconnecting');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose fires after this
    };
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(role: string, locomotiveIds: string[]): void {
    this.send({
      type: 'subscribe',
      payload: { role, locomotive_ids: locomotiveIds },
    });
  }

  private scheduleFlush(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const batch = this.buffer;
      this.buffer = [];
      if (batch.length > 0) {
        this.flushCallback(batch);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
        this.pongTimer = setTimeout(() => {
          this.ws?.close();
        }, HEARTBEAT_TIMEOUT_MS);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.heartbeatTimer = null;
    this.pongTimer = null;
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt) +
        Math.random() * 500,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanup();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
