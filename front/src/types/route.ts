export interface RouteContext {
  locomotive_id: string;
  route_id: string;
  segment_id: string;
  from: string;
  to: string;
  position_km: number;
  totalKm: number;
  planned_speed_limit_kmh: number;
  schedule_deviation_min: number;
  route_compliance_score: number;
  delay_risk_score: number;
  eta_to_checkpoint_min: number;
}
