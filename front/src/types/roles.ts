import type { UserRole } from './common';

/** What the WS client subscribes to */
export interface SubscriptionContext {
  role: UserRole;
  locomotiveIds: string[];
}

/** Per-role dispatcher processed overlay */
export interface DispatcherOverlay {
  locomotive_id: string;
  incident_priority_score: number;
  mission_readiness: number;
  operational_status_summary: string;
}

/** Per-role supervisor decision */
export type SupervisorDecision = 'allow' | 'monitor' | 'remove_from_service';
