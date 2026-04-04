import type { KZ8ATelemetry, KZ8AProcessed } from '@/types';
import type { ComponentStatus } from '@/types';

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

export class KZ8AGenerator {
  id: string;

  private speed = 75;
  private catenaryVoltage = 25;
  private catenaryCurrent = 310;
  private transformerTemp = 65;
  private transformerLoad = 55;
  private converterTemp = 50;
  private converterLoad = 48;
  private tractiveEffort = 180;
  private regenPower = 0;
  private energyMeter = 12480;
  private energyConsumption = 1850;
  private brakePressure = 5.1;

  constructor(id: string) {
    this.id = id;
  }

  tickTelemetry(): KZ8ATelemetry {
    this.speed = walk(this.speed, 3, 0, 160);
    this.catenaryVoltage = walk(this.catenaryVoltage, 0.3, 19, 29);
    this.catenaryCurrent = walk(this.catenaryCurrent, 15, 0, 800);
    this.transformerTemp = walk(this.transformerTemp, 1.5, 30, 120);
    this.transformerLoad = walk(this.transformerLoad, 3, 0, 100);
    this.converterTemp = walk(this.converterTemp, 1, 25, 100);
    this.converterLoad = walk(this.converterLoad, 2, 0, 100);
    this.tractiveEffort = walk(this.tractiveEffort, 10, 0, 400);
    this.regenPower =
      Math.random() < 0.3 ? walk(this.regenPower, 50, 0, 1200) : 0;
    this.energyConsumption = walk(this.energyConsumption, 100, 500, 4000);
    this.energyMeter += this.energyConsumption / 3600;
    this.brakePressure = walk(this.brakePressure, 0.1, 2, 7);

    return {
      locomotive_id: this.id,
      locomotive_model: 'KZ8A',
      timestamp_utc: new Date().toISOString(),
      speed_kmh: round(this.speed, 1),
      brake_system_status: this.brakePressure < 3 ? 'degraded' : 'ok',
      brake_system_pressure_bar: round(this.brakePressure, 2),
      fault_code: this.transformerTemp > 100 ? 'F-TRF-OVERHEAT' : null,
      communication_status: 'online',
      control_system_status: 'ok',
      pantograph_status: this.catenaryVoltage < 20 ? 'degraded' : 'ok',
      catenary_voltage_kv: round(this.catenaryVoltage, 1),
      catenary_current_a: round(this.catenaryCurrent),
      main_transformer_status: compStatus(100 - this.transformerTemp + 20),
      main_transformer_temp_c: round(this.transformerTemp),
      main_transformer_load_pct: round(this.transformerLoad),
      tractive_effort_kn: round(this.tractiveEffort),
      traction_drive_status: 'ok',
      traction_converter_status: compStatus(100 - this.converterTemp + 30),
      traction_converter_temp_c: round(this.converterTemp),
      traction_converter_load_pct: round(this.converterLoad),
      regenerative_braking_status: this.regenPower > 0 ? 'ok' : 'offline',
      regenerative_braking_power_kw: round(this.regenPower),
      electrical_brake_status: 'ok',
      automatic_pilot_status: 'ok',
      energy_meter_kwh: round(this.energyMeter),
      energy_consumption_kw: round(this.energyConsumption),
    };
  }

  computeProcessed(): KZ8AProcessed {
    const transformerRisk = clamp((this.transformerTemp - 60) * 1.5, 0, 100);
    const converterRisk = clamp((this.converterTemp - 40) * 1.2, 0, 100);
    const brakeRisk = clamp((4 - this.brakePressure) * 30, 0, 100);
    const elecRisk = clamp((25 - this.catenaryVoltage) * 10, 0, 100);

    let hi = 100;
    hi -= transformerRisk * 0.3;
    hi -= converterRisk * 0.2;
    hi -= brakeRisk * 0.15;
    hi -= elecRisk * 0.2;
    hi = clamp(Math.round(hi), 0, 100);

    const label =
      hi >= 80 ? 'Good' : hi >= 50 ? 'Warning' : 'Critical';

    const topFactors = [];
    if (transformerRisk > 20)
      topFactors.push({
        name: 'transformer_thermal_risk',
        impact: -Math.round(transformerRisk * 0.3),
        detail: `Temp ${round(this.transformerTemp)}°C`,
      });
    if (converterRisk > 20)
      topFactors.push({
        name: 'converter_thermal_risk',
        impact: -Math.round(converterRisk * 0.2),
        detail: `Temp ${round(this.converterTemp)}°C`,
      });
    if (brakeRisk > 10)
      topFactors.push({
        name: 'brake_risk',
        impact: -Math.round(brakeRisk * 0.15),
        detail: `Pressure ${round(this.brakePressure, 1)} bar`,
      });

    const rootCauses = [];
    if (this.transformerTemp > 85)
      rootCauses.push({
        component: 'main_transformer',
        probability: clamp(transformerRisk / 100, 0, 1),
        description: 'Thermal stress — potential cooling degradation',
      });
    if (this.converterTemp > 70)
      rootCauses.push({
        component: 'traction_converter',
        probability: clamp(converterRisk / 100, 0, 1),
        description: 'Converter overheating — thermal coupling',
      });

    return {
      locomotive_model: 'KZ8A',
      locomotive_id: this.id,
      timestamp_utc: new Date().toISOString(),
      health_index: hi,
      health_status: label as KZ8AProcessed['health_status'],
      electrical_supply_risk: round(elecRisk),
      transformer_health_score: round(100 - transformerRisk),
      transformer_thermal_risk: round(transformerRisk),
      traction_drive_health_score: 90,
      converter_thermal_risk: round(converterRisk),
      regen_efficiency_score: this.regenPower > 0 ? 75 : 0,
      brake_risk: round(brakeRisk),
      energy_efficiency_score: 72,
      fault_severity_score: this.transformerTemp > 100 ? 65 : 0,
      maintenance_priority_score: round(
        clamp(transformerRisk + converterRisk, 0, 100),
      ),
      root_cause_candidates: rootCauses,
      recommended_action:
        hi < 50
          ? 'Reduce load immediately'
          : hi < 80
            ? 'Monitor transformer, consider reducing effort'
            : 'Continue normal operation',
      recommended_maintenance_action:
        transformerRisk > 50
          ? 'Schedule transformer cooling inspection within 24h'
          : 'No immediate action',
      top_factors: topFactors,
    };
  }
}
