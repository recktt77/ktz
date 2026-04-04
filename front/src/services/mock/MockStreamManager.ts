import type { ValidatedWSMessage } from '../ws/schemas';
import type { AlertItem, FleetEntry } from '@/types';
import { KZ8AGenerator } from './kz8aGenerator';
import { TE33AGenerator } from './te33aGenerator';

type FlushCallback = (messages: ValidatedWSMessage[]) => void;

let alertCounter = 0;

export class MockStreamManager {
  private kz8a: KZ8AGenerator;
  private te33a: TE33AGenerator;
  private listener: FlushCallback | null = null;
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;
  private processedInterval: ReturnType<typeof setInterval> | null = null;
  private fleetInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.kz8a = new KZ8AGenerator('KTZ-4021');
    this.te33a = new TE33AGenerator('KTZ-7015');
  }

  onFlush(listener: FlushCallback): void {
    this.listener = listener;
  }

  private emit(messages: ValidatedWSMessage[]): void {
    this.listener?.(messages);
  }

  start(): void {
    // Initial snapshot after a short delay
    setTimeout(() => {
      const kz8aTel = this.kz8a.tickTelemetry();
      const kz8aProc = this.kz8a.computeProcessed();
      const te33aTel = this.te33a.tickTelemetry();
      const te33aProc = this.te33a.computeProcessed();

      this.emit([
        {
          type: 'snapshot_init',
          payload: {
            role: 'driver',
            locomotives: [
              {
                telemetry: kz8aTel,
                processed: kz8aProc,
                alerts: [],
                route: {
                  locomotive_id: 'KTZ-4021',
                  route_id: 'R-AST-ALM-001',
                  segment_id: 'S-047',
                  from: 'Astana',
                  to: 'Almaty',
                  position_km: 142.3,
                  totalKm: 380,
                  planned_speed_limit_kmh: 100,
                  schedule_deviation_min: -2.3,
                  route_compliance_score: 92,
                  delay_risk_score: 15,
                  eta_to_checkpoint_min: 38,
                },
              },
              {
                telemetry: te33aTel,
                processed: te33aProc,
                alerts: [],
                route: {
                  locomotive_id: 'KTZ-7015',
                  route_id: 'R-KRG-TSE-005',
                  segment_id: 'S-012',
                  from: 'Karaganda',
                  to: 'Astana',
                  position_km: 87.6,
                  totalKm: 230,
                  planned_speed_limit_kmh: 90,
                  schedule_deviation_min: 1.5,
                  route_compliance_score: 88,
                  delay_risk_score: 22,
                  eta_to_checkpoint_min: 51,
                },
              },
            ],
          },
        },
      ]);
    }, 200);

    // Telemetry updates every 1s
    this.telemetryInterval = setInterval(() => {
      const batch: ValidatedWSMessage[] = [];

      const kz8aTel = this.kz8a.tickTelemetry();
      batch.push({ type: 'telemetry_update', payload: kz8aTel });

      const te33aTel = this.te33a.tickTelemetry();
      batch.push({ type: 'telemetry_update', payload: te33aTel });

      // Occasional alerts
      if (kz8aTel.main_transformer_temp_c > 90 && Math.random() < 0.08) {
        batch.push({
          type: 'alert_created',
          payload: makeAlert(
            'KTZ-4021', 'KZ8A', 'warning',
            'Transformer Overheat', 'main_transformer',
            'main_transformer_temp_c',
            kz8aTel.main_transformer_temp_c, 85,
          ),
        });
      }
      if (te33aTel.engine_load_pct > 88 && Math.random() < 0.1) {
        batch.push({
          type: 'alert_created',
          payload: makeAlert(
            'KTZ-7015', 'TE33A', 'warning',
            'Engine Overload', 'diesel_engine',
            'engine_load_pct',
            te33aTel.engine_load_pct, 85,
          ),
        });
      }
      if (te33aTel.fuel_level_pct < 20 && Math.random() < 0.05) {
        batch.push({
          type: 'alert_created',
          payload: makeAlert(
            'KTZ-7015', 'TE33A', 'critical',
            'Low Fuel', 'fuel_system',
            'fuel_level_pct',
            te33aTel.fuel_level_pct, 20,
          ),
        });
      }

      this.emit(batch);
    }, 1000);

    // Processed analytics every 8s
    this.processedInterval = setInterval(() => {
      this.emit([
        { type: 'processed_update', payload: this.kz8a.computeProcessed() },
        { type: 'processed_update', payload: this.te33a.computeProcessed() },
      ]);
    }, 8000);

    // Fleet summary every 15s (for supervisor view)
    this.fleetInterval = setInterval(() => {
      const kProc = this.kz8a.computeProcessed();
      const tProc = this.te33a.computeProcessed();
      const kTel = this.kz8a.tickTelemetry();
      const tTel = this.te33a.tickTelemetry();

      const fleet: FleetEntry[] = [
        {
          locomotive_id: 'KTZ-4021',
          locomotive_model: 'KZ8A',
          timestamp_utc: new Date().toISOString(),
          health_index: kProc.health_index,
          fault_code: kTel.fault_code,
          alert_count: 0,
          communication_status: 'online',
          brake_system_status: kTel.brake_system_status,
          pantograph_status: kTel.pantograph_status,
          main_transformer_status: kTel.main_transformer_status,
          traction_drive_status: kTel.traction_drive_status,
          availability_score: kProc.health_index > 70 ? 95 : 60,
          downtime_risk_score: 100 - kProc.health_index,
          maintenance_priority_score: kProc.maintenance_priority_score,
          criticality_rank: kProc.health_index < tProc.health_index ? 1 : 2,
          fleet_health_contribution: 12.5,
          operational_status_summary:
            kProc.health_index >= 80 ? 'Normal' : 'Monitor',
        },
        {
          locomotive_id: 'KTZ-7015',
          locomotive_model: 'TE33A',
          timestamp_utc: new Date().toISOString(),
          health_index: tProc.health_index,
          fault_code: tTel.fault_code,
          alert_count: 0,
          communication_status: 'online',
          brake_system_status: tTel.brake_system_status,
          engine_status: tTel.engine_status,
          fuel_level_pct: tTel.fuel_level_pct,
          propulsion_system_status: tTel.propulsion_system_status,
          dynamic_brake_status: tTel.dynamic_brake_status,
          availability_score: tProc.health_index > 70 ? 90 : 55,
          downtime_risk_score: 100 - tProc.health_index,
          maintenance_priority_score: tProc.maintenance_priority_score,
          criticality_rank: tProc.health_index < kProc.health_index ? 1 : 2,
          fleet_health_contribution: 8.1,
          fuel_readiness_score: tTel.fuel_level_pct > 30 ? 85 : 40,
          operational_status_summary:
            tProc.health_index >= 80
              ? 'Normal'
              : tProc.health_index >= 50
                ? 'Monitor'
                : 'Inspection needed',
        },
      ];

      this.emit([{ type: 'fleet_summary_update', payload: fleet }]);
    }, 15000);
  }

  stop(): void {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    if (this.processedInterval) clearInterval(this.processedInterval);
    if (this.fleetInterval) clearInterval(this.fleetInterval);
  }
}

function makeAlert(
  locoId: string,
  model: 'KZ8A' | 'TE33A',
  severity: 'info' | 'warning' | 'critical',
  title: string,
  component: string,
  metric: string,
  value: number,
  threshold: number,
): AlertItem {
  alertCounter++;
  return {
    id: `mock-alert-${alertCounter}`,
    locomotive_id: locoId,
    locomotive_model: model,
    severity,
    title,
    message: `${title}: ${value.toFixed(1)} (threshold: ${threshold})`,
    component,
    metric,
    value,
    threshold,
    timestamp_utc: new Date().toISOString(),
    acknowledged: false,
  };
}
