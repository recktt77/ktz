import { useDashboardStore } from '@/store';
import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { HealthCard } from '@/widgets/common/HealthCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { SpeedGauge } from '@/widgets/common/SpeedGauge';
import { SparklineKPI } from '@/widgets/common/SparklineKPI';
import { DiagnosticBars } from '@/widgets/common/DiagnosticBars';
import { RadialHealthChart } from '@/widgets/common/RadialHealthChart';
import { EngineerKZ8APanel } from '@/widgets/engineer/EngineerKZ8APanel';
import { EngineerTE33APanel } from '@/widgets/engineer/EngineerTE33APanel';
import { Skeleton } from '@/components/Skeleton';
import { isKZ8ATelemetry, isTE33ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';
import type { KZ8ATelemetry, TE33ATelemetry, KZ8AProcessed, TE33AProcessed } from '@/types';

export function EngineerDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!locoId || !telemetry) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const model = telemetry.locomotive_model;
  const hi = processed?.health_index ?? 0;

  // Radial chart: component health breakdown
  const radialSegments = model === 'KZ8A' && processed && isKZ8AProcessed(processed)
    ? [
        { label: 'Трансформатор', value: (processed as KZ8AProcessed).transformer_health_score, color: 'var(--accent-amber)' },
        { label: 'Тяговый привод', value: (processed as KZ8AProcessed).traction_drive_health_score, color: 'var(--accent-cyan)' },
        { label: 'Рекуперация', value: (processed as KZ8AProcessed).regen_efficiency_score, color: 'var(--accent-pink)' },
        { label: 'Энергоэффективность', value: (processed as KZ8AProcessed).energy_efficiency_score, color: 'var(--status-normal)' },
      ]
    : processed && isTE33AProcessed(processed)
    ? [
        { label: 'Двигатель', value: (processed as TE33AProcessed).engine_health_score, color: 'var(--accent-amber)' },
        { label: 'Топливо', value: (processed as TE33AProcessed).fuel_efficiency_score, color: 'var(--accent-cyan)' },
        { label: 'Пропульсия', value: (processed as TE33AProcessed).propulsion_health_score, color: 'var(--accent-pink)' },
        { label: 'Дин. тормоз', value: (processed as TE33AProcessed).dynamic_brake_availability_score, color: 'var(--status-normal)' },
      ]
    : [];

  // Diagnostic bars: key system parameters
  const diagRows = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? [
        { label: 'Трансформатор (темп.)', value: (telemetry as KZ8ATelemetry).main_transformer_temp_c, maxValue: 120, color: 'var(--accent-amber)', unit: '°C' },
        { label: 'Конвертер (темп.)', value: (telemetry as KZ8ATelemetry).traction_converter_temp_c, maxValue: 100, color: 'var(--accent-coral)', unit: '°C' },
        { label: 'Давление тормозов', value: (telemetry as KZ8ATelemetry).brake_system_pressure_bar, maxValue: 8, color: 'var(--accent-cyan)', unit: 'бар' },
        { label: 'Тяговое усилие', value: (telemetry as KZ8ATelemetry).tractive_effort_kn, maxValue: 500, color: 'var(--accent-blue)', unit: 'кН' },
        { label: 'Рекуперация', value: (telemetry as KZ8ATelemetry).regenerative_braking_power_kw, maxValue: 500, color: 'var(--accent-pink)', unit: 'кВ' },
      ]
    : isTE33ATelemetry(telemetry)
    ? [
        { label: 'Двигатель (нагрузка)', value: (telemetry as TE33ATelemetry).engine_load_pct, maxValue: 100, color: 'var(--accent-amber)', unit: '%' },
        { label: 'Обороты двигателя', value: (telemetry as TE33ATelemetry).engine_rpm, maxValue: 2200, color: 'var(--accent-blue)', unit: 'RPM' },
        { label: 'Уровень топлива', value: (telemetry as TE33ATelemetry).fuel_level_pct, maxValue: 100, color: 'var(--accent-cyan)', unit: '%' },
        { label: 'Расход топлива', value: (telemetry as TE33ATelemetry).fuel_consumption_lph, maxValue: 300, color: 'var(--accent-coral)', unit: 'л/ч' },
        { label: 'Давление тормозов', value: (telemetry as TE33ATelemetry).brake_system_pressure_bar, maxValue: 8, color: 'var(--accent-pink)', unit: 'бар' },
      ]
    : [];

  return (
    <div className="layout-driver animate-fade-in">
      {/* Left: Alerts */}
      <aside>
        <AlertsPanel locomotiveId={locoId} />
      </aside>

      {/* Main content */}
      <div className="space-y-4">
        {/* Row 1: Health gauge + Speed + Sparkline KPIs + Radial */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 lg:col-span-2">
            <HealthCard locoId={locoId} compact />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <SpeedGauge locoId={locoId} />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <div className="space-y-3">
              <SparklineKPI
                locoId={locoId}
                label="Индекс здоровья"
                metricKey="speed_kmh"
                value={hi}
                unit="%"
                color={hi >= 85 ? '#34d399' : hi >= 60 ? '#f5b946' : '#ef4444'}
                accent={hi >= 85 ? 'kpi-card--normal' : hi >= 60 ? 'kpi-card--amber' : 'kpi-card--critical'}
              />
              <SparklineKPI
                locoId={locoId}
                label={model === 'KZ8A' ? 'Напряжение сети' : 'Обороты'}
                metricKey={model === 'KZ8A' ? 'catenary_voltage_kv' : 'engine_rpm'}
                value={model === 'KZ8A' && isKZ8ATelemetry(telemetry)
                  ? (telemetry as KZ8ATelemetry).catenary_voltage_kv.toFixed(1)
                  : isTE33ATelemetry(telemetry)
                  ? Math.round((telemetry as TE33ATelemetry).engine_rpm)
                  : 0}
                unit={model === 'KZ8A' ? 'кВ' : 'RPM'}
                color="var(--accent-blue)"
                accent="kpi-card--blue"
              />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            {radialSegments.length > 0 && (
              <RadialHealthChart
                segments={radialSegments}
                centerValue={hi}
                centerLabel="Health"
                size={170}
              />
            )}
          </div>
        </div>

        {/* Row 2: Diagnostic Bars + Model-specific detailed diagnostics */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4">
            <DiagnosticBars
              title={`Состояние ${model}`}
              rows={diagRows}
            />
          </div>
          <div className="col-span-12 lg:col-span-8">
            {/* Model-specific diagnostic panel */}
            {model === 'KZ8A' ? (
              <EngineerKZ8APanel locoId={locoId} />
            ) : (
              <EngineerTE33APanel locoId={locoId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
