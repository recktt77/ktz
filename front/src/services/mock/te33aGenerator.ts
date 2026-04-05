import type { TE33ATelemetry, TE33AProcessed, ComponentStatus } from '@/types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function walk(current: number, step: number, min: number, max: number): number {
  return clamp(current + (Math.random() - 0.5) * 2 * step, min, max);
}

function round(v: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function compStatus(health: number): ComponentStatus {
  if (health > 75) return 'ok';
  if (health > 40) return 'degraded';
  return 'fault';
}

export class TE33AGenerator {
  id: string;

  private speed = 65;
  private engineRpm = 1450;
  private engineLoad = 78;
  private fuelLevel = 68;
  private fuelConsumption = 210;
  private brakePressure = 4.8;

  constructor(id: string) {
    this.id = id;
  }

  tickTelemetry(): TE33ATelemetry {
    this.speed = walk(this.speed, 2.5, 0, 140);
    this.engineRpm = walk(this.engineRpm, 50, 900, 2100);
    this.engineLoad = walk(this.engineLoad, 4, 45, 100);
    this.fuelLevel = Math.max(0, this.fuelLevel - 0.01 - Math.random() * 0.02);
    this.fuelConsumption = walk(this.fuelConsumption, 10, 120, 350);
    this.brakePressure = walk(this.brakePressure, 0.15, 3, 7);

    const engineDegraded = this.engineLoad > 90 || this.engineRpm > 1900;

    return {
      locomotive_id: this.id,
      locomotive_model: 'TE33A',
      timestamp_utc: new Date().toISOString(),
      speed_kmh: round(this.speed, 1),
      brake_system_status: this.brakePressure < 3 ? 'degraded' : 'ok',
      brake_system_pressure_bar: round(this.brakePressure, 2),
      fault_code: engineDegraded ? 'F-ENG-OVERLOAD' : null,
      communication_status: 'online',
      control_system_status: 'ok',
      engine_status: compStatus(engineDegraded ? 40 : 85),
      engine_rpm: round(this.engineRpm),
      engine_load_pct: round(this.engineLoad),
      fuel_level_pct: round(this.fuelLevel, 1),
      fuel_consumption_lph: round(this.fuelConsumption),
      propulsion_system_status: 'ok',
      dynamic_brake_status: this.speed > 20 ? 'ok' : 'offline',
      compressor_status: 'ok',
      auxiliaries_status: 'ok',
      onboard_diagnostic_status: 'ok',
      remote_diagnostic_alert: engineDegraded
        ? 'Engine overload detected'
        : null,
      crew_interface_status: 'ok',
      computer_system_status: 'ok',
      communications_status: 'online',
    };
  }

  computeProcessed(): TE33AProcessed {
    const engineRisk = clamp((this.engineLoad - 70) * 2, 0, 100);
    const fuelRisk = clamp((30 - this.fuelLevel) * 3, 0, 100);
    const brakeRisk = clamp((4 - this.brakePressure) * 30, 0, 100);

    // Sub-scores computed from real telemetry
    const engineHealthScore = round(100 - engineRisk);
    const fuelEfficiencyScore = round(
      clamp(100 - Math.abs(this.fuelConsumption - 150), 0, 100),
    );
    const propulsionHealthScore = round(
      clamp(100 - engineRisk * 0.5 - brakeRisk * 0.2, 0, 100),
    );
    const dynamicBrakeScore = round(
      this.speed > 20
        ? clamp(100 - brakeRisk * 0.6, 0, 100)
        : clamp(15 - brakeRisk * 0.2, 0, 20),
    );

    // Health index = weighted average of sub-scores
    const hi = clamp(Math.round(
      engineHealthScore * 0.30 +
      fuelEfficiencyScore * 0.20 +
      propulsionHealthScore * 0.25 +
      dynamicBrakeScore * 0.10 +
      (100 - brakeRisk) * 0.15,
    ), 0, 100);

    const label =
      hi >= 80 ? 'Good' : hi >= 50 ? 'Warning' : 'Critical';

    const fuelHoursRemaining =
      this.fuelConsumption > 0
        ? ((this.fuelLevel / 100) * 5000) / this.fuelConsumption
        : 999;

    const topFactors = [];
    if (engineRisk > 15)
      topFactors.push({
        name: 'engine_overload_risk',
        impact: -Math.round(engineRisk * 0.35),
        detail: `Load ${round(this.engineLoad)}%`,
      });
    if (fuelRisk > 10)
      topFactors.push({
        name: 'fuel_level',
        impact: -Math.round(fuelRisk * 0.2),
        detail: `${round(this.fuelLevel, 1)}% remaining`,
      });
    if (brakeRisk > 10)
      topFactors.push({
        name: 'brake_risk',
        impact: -Math.round(brakeRisk * 0.15),
        detail: `Pressure ${round(this.brakePressure, 1)} bar`,
      });

    const rootCauses = [];
    if (this.engineLoad > 85)
      rootCauses.push({
        component: 'diesel_engine',
        probability: clamp(engineRisk / 100, 0, 1),
        description:
          'Sustained high load — possible injector or turbo issue',
      });
    if (this.fuelLevel < 20)
      rootCauses.push({
        component: 'fuel_system',
        probability: 0.3,
        description: 'Low fuel — verify fuel gauge calibration',
      });

    return {
      locomotive_model: 'TE33A',
      locomotive_id: this.id,
      timestamp_utc: new Date().toISOString(),
      health_index: hi,
      health_status: label as TE33AProcessed['health_status'],
      engine_health_score: engineHealthScore,
      engine_overload_risk: round(engineRisk),
      fuel_efficiency_score: fuelEfficiencyScore,
      fuel_anomaly_score: fuelRisk > 30 ? round(fuelRisk) : 0,
      fuel_remaining_eta_h: round(fuelHoursRemaining, 1),
      propulsion_health_score: propulsionHealthScore,
      dynamic_brake_availability_score: dynamicBrakeScore,
      brake_risk: round(brakeRisk),
      compressor_readiness_score: 95,
      maintenance_alert_score: round(
        clamp(engineRisk + fuelRisk * 0.5, 0, 100),
      ),
      fault_severity_score: this.engineLoad > 90 ? 55 : 0,
      maintenance_priority_score: round(
        clamp(engineRisk + brakeRisk * 0.5, 0, 100),
      ),
      root_cause_candidates: rootCauses,
      recommended_action:
        hi < 50
          ? 'Reduce throttle, prepare for stop'
          : hi < 80
            ? 'Monitor engine load closely'
            : 'Continue normal operation',
      recommended_maintenance_action:
        engineRisk > 50
          ? 'Schedule engine inspection within 48h'
          : 'No immediate action',
      top_factors: topFactors,
    };
  }
}
