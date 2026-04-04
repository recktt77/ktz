import type { AlertSeverity, LocomotiveModel } from './common';

export interface AlertItem {
  id: string;
  locomotive_id: string;
  locomotive_model: LocomotiveModel;
  severity: AlertSeverity;
  title: string;
  message: string;
  component: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp_utc: string;
  acknowledged: boolean;
}
