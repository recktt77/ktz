// ──── Shared base types ────

export type LocomotiveModel = 'KZ8A' | 'TE33A';

export type UserRole = 'driver' | 'dispatcher' | 'engineer' | 'supervisor' | 'admin';

export type MetricStatus = 'normal' | 'warning' | 'critical';

export type ComponentStatus = 'ok' | 'degraded' | 'fault' | 'offline';

export type CommunicationStatus = 'online' | 'degraded' | 'offline';

export type HealthLabel = 'Good' | 'Warning' | 'Critical';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface TelemetryPoint {
  timestamp: number; // Unix ms
  value: number;
}

export interface BaseTelemetry {
  locomotive_id: string;
  locomotive_model: LocomotiveModel;
  timestamp_utc: string;
  speed_kmh: number;
  brake_system_status: ComponentStatus;
  brake_system_pressure_bar: number;
  fault_code: string | null;
  communication_status: CommunicationStatus;
  control_system_status: ComponentStatus;
}

export interface TopFactor {
  name: string;
  impact: number;
  detail: string;
}

export interface RootCauseCandidate {
  component: string;
  probability: number;
  description: string;
}
