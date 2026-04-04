import { useDashboardStore } from '@/store';
import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { SpeedGauge } from '@/widgets/common/SpeedGauge';
import { SparklineKPI } from '@/widgets/common/SparklineKPI';
import { BarChartWidget } from '@/widgets/common/BarChartWidget';
import { RadialHealthChart } from '@/widgets/common/RadialHealthChart';
import { DiagnosticBars } from '@/widgets/common/DiagnosticBars';
import { RouteContextWidget } from '@/widgets/common/RouteContextWidget';
import { DriverKZ8APanel } from '@/widgets/driver/DriverKZ8APanel';
import { DriverTE33APanel } from '@/widgets/driver/DriverTE33APanel';
import { RailwayMap } from '@/widgets/map';
import { Skeleton } from '@/components/Skeleton';
import { isKZ8ATelemetry, isTE33ATelemetry } from '@/types';
import type { KZ8ATelemetry, TE33ATelemetry } from '@/types';

export function DriverDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!locoId || !telemetry) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const model = telemetry.locomotive_model;
  const hi = processed?.health_index ?? 0;
  const hiStatus = processed?.health_status ?? 'Good';

  // Bar chart tabs per model
  const barTabs = model === 'KZ8A'
    ? [
        { id: 'traction', label: 'Тяга', metrics: [
          { key: 'tractive_effort_kn', label: 'Тяговое усилие', color: '#22d3ee' },
          { key: 'catenary_current_a', label: 'Ток сети', color: '#f47e6c' },
        ]},
        { id: 'brake', label: 'Тормоза', metrics: [
          { key: 'brake_system_pressure_bar', label: 'Давление', color: '#22d3ee' },
          { key: 'regenerative_braking_power_kw', label: 'Рекуперация', color: '#f5b946' },
        ]},
        { id: 'mode', label: 'Режим движения', metrics: [
          { key: 'speed_kmh', label: 'Скорость', color: '#22d3ee' },
          { key: 'catenary_voltage_kv', label: 'Напряжение', color: '#f47e6c' },
        ]},
      ]
    : [
        { id: 'traction', label: 'Тяга', metrics: [
          { key: 'engine_rpm', label: 'Обороты', color: '#22d3ee' },
          { key: 'engine_load_pct', label: 'Нагрузка', color: '#f47e6c' },
        ]},
        { id: 'brake', label: 'Тормоза', metrics: [
          { key: 'brake_system_pressure_bar', label: 'Давление', color: '#22d3ee' },
          { key: 'fuel_consumption_lph', label: 'Расход топлива', color: '#f5b946' },
        ]},
        { id: 'mode', label: 'Режим движения', metrics: [
          { key: 'speed_kmh', label: 'Скорость', color: '#22d3ee' },
          { key: 'engine_load_pct', label: 'Нагрузка', color: '#f47e6c' },
        ]},
      ];

  // Radial chart segments per model
  const radialSegments = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? [
        { label: 'Напряжение сети', value: Math.min(100, Math.round((telemetry as KZ8ATelemetry).catenary_voltage_kv / 30 * 100)), color: 'var(--status-critical)' },
        { label: 'Статус пантографа', value: (telemetry as KZ8ATelemetry).pantograph_status === 'ok' ? 95 : 40, color: 'var(--accent-cyan)' },
        { label: 'Трансформатор', value: Math.max(0, 100 - Math.round((telemetry as KZ8ATelemetry).main_transformer_temp_c / 120 * 100)), color: 'var(--accent-coral)' },
        { label: 'Рекуперация', value: Math.min(100, Math.round((telemetry as KZ8ATelemetry).regenerative_braking_power_kw / 500 * 100)), color: 'var(--accent-pink)' },
      ]
    : [
        { label: 'Двигатель', value: 100 - ((telemetry as TE33ATelemetry).engine_load_pct ?? 50), color: 'var(--status-critical)' },
        { label: 'Топливо', value: (telemetry as TE33ATelemetry).fuel_level_pct ?? 50, color: 'var(--accent-cyan)' },
        { label: 'Тормозная система', value: Math.min(100, Math.round(((telemetry as TE33ATelemetry).brake_system_pressure_bar ?? 5) / 8 * 100)), color: 'var(--accent-coral)' },
        { label: 'Пропульсия', value: (telemetry as TE33ATelemetry).propulsion_system_status === 'ok' ? 90 : 45, color: 'var(--accent-pink)' },
      ];

  // Diagnostic bars per model
  const diagRows = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? [
        { label: 'Трансформатор (темп.)', value: (telemetry as KZ8ATelemetry).main_transformer_temp_c, maxValue: 120, color: 'var(--accent-amber)', unit: '°C' },
        { label: 'Напряжение контактной сети', value: (telemetry as KZ8ATelemetry).catenary_voltage_kv, maxValue: 30, color: 'var(--accent-cyan)', unit: 'кВ' },
        { label: 'Давление тормозов', value: (telemetry as KZ8ATelemetry).brake_system_pressure_bar, maxValue: 8, color: 'var(--accent-coral)', unit: 'бар' },
        { label: 'Конвертер (темп.)', value: (telemetry as KZ8ATelemetry).traction_converter_temp_c, maxValue: 100, color: 'var(--accent-blue)', unit: '°C' },
      ]
    : [
        { label: 'Двигатель (нагрузка)', value: (telemetry as TE33ATelemetry).engine_load_pct, maxValue: 100, color: 'var(--accent-amber)', unit: '%' },
        { label: 'Уровень топлива', value: (telemetry as TE33ATelemetry).fuel_level_pct, maxValue: 100, color: 'var(--accent-cyan)', unit: '%' },
        { label: 'Расход топлива', value: (telemetry as TE33ATelemetry).fuel_consumption_lph, maxValue: 300, color: 'var(--accent-coral)', unit: 'л/ч' },
        { label: 'Динамический тормоз', value: (telemetry as TE33ATelemetry).dynamic_brake_status === 'ok' ? 60 : 20, maxValue: 100, color: 'var(--accent-blue)', unit: '' },
      ];

  const avgRadial = Math.round(radialSegments.reduce((s, seg) => s + seg.value, 0) / radialSegments.length);

  return (
    <div className="layout-driver animate-fade-in">
      {/* Left: Alerts rail */}
      <aside>
        <div className="space-y-3">
          <AlertsPanel locomotiveId={locoId} />
        </div>
      </aside>

      {/* Main content */}
      <div className="space-y-4">
        {/* Row 1: Speed gauge + sparkline KPIs + Route compact map */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <SpeedGauge locoId={locoId} />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <SparklineKPI
              locoId={locoId}
              label="Средний health"
              metricKey="speed_kmh"
              value={`${hi}%`}
              color={hiStatus === 'Critical' ? '#ef4444' : hiStatus === 'Warning' ? '#f5b946' : '#34d399'}
              accent={hiStatus === 'Critical' ? 'kpi-card--critical' : hiStatus === 'Warning' ? 'kpi-card--amber' : 'kpi-card--normal'}
            />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <SparklineKPI
              locoId={locoId}
              label="Риск задержки"
              metricKey="brake_system_pressure_bar"
              value={`${Math.max(0, 100 - hi)}%`}
              color="#f47e6c"
              accent="kpi-card--coral"
            />
          </div>
          <div className="col-span-12 lg:col-span-8">
            {/* Route mini-map */}
            <div className="grid grid-cols-1 gap-3">
              <RouteContextWidget locoId={locoId} />
              <RailwayMap compact className="w-full" />
            </div>
          </div>
        </div>

        {/* Row 2: Big central bar chart + radial chart */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <BarChartWidget locoId={locoId} tabs={barTabs} height={220} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <RadialHealthChart
              segments={radialSegments}
              centerValue={avgRadial}
            />
          </div>
        </div>

        {/* Row 3: Diagnostic bars + model-specific status */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5">
            <DiagnosticBars
              title={`Состояние ${model}`}
              rows={diagRows}
            />
          </div>
          <div className="col-span-12 lg:col-span-7">
            {model === 'KZ8A' ? (
              <DriverKZ8APanel locoId={locoId} />
            ) : (
              <DriverTE33APanel locoId={locoId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
