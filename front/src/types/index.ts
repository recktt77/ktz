export type { LocomotiveModel, UserRole, MetricStatus, ComponentStatus, CommunicationStatus, HealthLabel, AlertSeverity, ConnectionStatus, TelemetryPoint, BaseTelemetry, TopFactor, RootCauseCandidate } from './common';
export type { KZ8ATelemetry, KZ8AProcessed } from './kz8a';
export type { TE33ATelemetry, TE33AProcessed } from './te33a';
export type { LocomotiveTelemetry, LocomotiveProcessed } from './processed';
export { isKZ8ATelemetry, isTE33ATelemetry, isKZ8AProcessed, isTE33AProcessed } from './processed';
export type { AlertItem } from './alerts';
export type { RouteContext } from './route';
export type { FleetEntry, KZ8AFleetEntry, TE33AFleetEntry } from './fleet';
export { isKZ8AFleet, isTE33AFleet } from './fleet';
export type { DispatcherOverlay, SubscriptionContext, SupervisorDecision } from './roles';
export type { WSMessage, SnapshotPayload, LocomotiveSnapshot, LocomotiveStatusUpdate } from './ws';

// Auth Service types
export type { AuthUser, LoginRequest, LoginResponse, RegisterRequest, Invitation, Station } from './auth';

// Map Service types
export type { Railway, MapStation, TrackSegment, StationTrackCoverage, SpeedLimit, MapOverview, LocomotivePosition } from './map';

