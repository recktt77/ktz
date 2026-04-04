import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  UserRole,
  ConnectionStatus,
  TelemetryPoint,
  LocomotiveTelemetry,
  LocomotiveProcessed,
  AlertItem,
  RouteContext,
  FleetEntry,
  DispatcherOverlay,
  SnapshotPayload,
} from '@/types';
import { appendToRingBuffer } from '@/lib/ringBuffer';
import { MAX_ALERTS, MAX_CHART_POINTS, CHART_METRICS } from '@/lib/constants';

// ──── Store shape ────

export interface DashboardStore {
  // UI selection
  selectedRole: UserRole;
  selectedLocomotiveId: string | null;

  // Connection
  connection: {
    status: ConnectionStatus;
    lastMessageAt: number | null;
    reconnectAttempt: number;
  };

  // Per-locomotive data
  telemetry: Record<string, LocomotiveTelemetry>;
  processed: Record<string, LocomotiveProcessed>;
  chartHistory: Record<string, TelemetryPoint[]>;
  routes: Record<string, RouteContext>;
  dispatcherOverlays: Record<string, DispatcherOverlay>;

  // Cross-locomotive
  alerts: AlertItem[];
  fleet: FleetEntry[];

  // Actions
  setRole: (role: UserRole) => void;
  selectLocomotive: (id: string) => void;
  applySnapshot: (snapshot: SnapshotPayload) => void;
  updateTelemetry: (t: LocomotiveTelemetry) => void;
  updateProcessed: (p: LocomotiveProcessed) => void;
  addAlert: (a: AlertItem) => void;
  resolveAlert: (id: string) => void;
  updateRoute: (r: RouteContext) => void;
  updateDispatcherOverlay: (o: DispatcherOverlay) => void;
  updateFleet: (entries: FleetEntry[]) => void;
  batchUpdateChartHistory: (updates: Record<string, TelemetryPoint[]>) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  touchLastMessage: () => void;
}

// ──── Store implementation ────

export const useDashboardStore = create<DashboardStore>()(
  subscribeWithSelector((set) => ({
    selectedRole: 'driver',
    selectedLocomotiveId: null,

    connection: { status: 'connecting', lastMessageAt: null, reconnectAttempt: 0 },

    telemetry: {},
    processed: {},
    chartHistory: {},
    routes: {},
    dispatcherOverlays: {},
    alerts: [],
    fleet: [],

    // ─── UI actions ───

    setRole: (role) => set({ selectedRole: role }),

    selectLocomotive: (id) => set({ selectedLocomotiveId: id }),

    // ─── Snapshot (initial load / reconnect) ───

    applySnapshot: (snapshot) => {
      const telemetry: Record<string, LocomotiveTelemetry> = {};
      const processed: Record<string, LocomotiveProcessed> = {};
      const chartHistory: Record<string, TelemetryPoint[]> = {};
      const routes: Record<string, RouteContext> = {};
      let alerts: AlertItem[] = [];

      for (const loco of snapshot.locomotives) {
        const id = loco.telemetry.locomotive_id;
        const model = loco.telemetry.locomotive_model;
        telemetry[id] = loco.telemetry;
        processed[id] = loco.processed;
        alerts = alerts.concat(loco.alerts);
        if (loco.route) routes[id] = loco.route;

        // Seed chart history with one initial point per tracked metric
        const ts = new Date(loco.telemetry.timestamp_utc).getTime();
        const metricsToTrack = CHART_METRICS[model];
        for (const metric of metricsToTrack) {
          const value = (loco.telemetry as unknown as Record<string, unknown>)[metric];
          if (typeof value === 'number') {
            chartHistory[`${id}:${metric}`] = [{ timestamp: ts, value }];
          }
        }
      }

      set({
        telemetry,
        processed,
        chartHistory,
        routes,
        alerts: alerts.slice(0, MAX_ALERTS),
        selectedLocomotiveId:
          snapshot.locomotives[0]?.telemetry.locomotive_id ?? null,
      });
    },

    // ─── Incremental updates ───

    updateTelemetry: (t) =>
      set((state) => ({
        telemetry: { ...state.telemetry, [t.locomotive_id]: t },
      })),

    updateProcessed: (p) =>
      set((state) => ({
        processed: { ...state.processed, [p.locomotive_id]: p },
      })),

    addAlert: (a) =>
      set((state) => ({
        alerts: [a, ...state.alerts].slice(0, MAX_ALERTS),
      })),

    resolveAlert: (id) =>
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a,
        ),
      })),

    updateRoute: (r) =>
      set((state) => ({
        routes: { ...state.routes, [r.locomotive_id]: r },
      })),

    updateDispatcherOverlay: (o) =>
      set((state) => ({
        dispatcherOverlays: { ...state.dispatcherOverlays, [o.locomotive_id]: o },
      })),

    updateFleet: (entries) => set({ fleet: entries }),

    batchUpdateChartHistory: (updates) =>
      set((state) => ({
        chartHistory: { ...state.chartHistory, ...updates },
      })),

    // ─── Connection ───

    setConnectionStatus: (status) =>
      set((state) => ({
        connection: {
          ...state.connection,
          status,
          reconnectAttempt:
            status === 'connected' ? 0 : state.connection.reconnectAttempt,
        },
      })),

    touchLastMessage: () =>
      set((state) => ({
        connection: { ...state.connection, lastMessageAt: Date.now() },
      })),
  })),
);
