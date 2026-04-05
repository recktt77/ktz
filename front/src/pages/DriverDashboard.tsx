import { useDashboardStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
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
import { isKZ8ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';
import type { KZ8ATelemetry, TE33ATelemetry, KZ8AProcessed, TE33AProcessed } from '@/types';

export function DriverDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);
  const user = useAuthStore((s) => s.user);

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
          { key: 'energy_consumption_kw', label: 'Потребление', color: '#e8943a' },
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
          { key: 'fuel_consumption_lph', label: 'Расход топлива', color: '#e8943a' },
        ]},
        { id: 'mode', label: 'Режим движения', metrics: [
          { key: 'speed_kmh', label: 'Скорость', color: '#22d3ee' },
          { key: 'fuel_level_pct', label: 'Топливо', color: '#f47e6c' },
        ]},
      ];

  // Radial chart segments: use processed scores when available
  const radialSegments = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? (() => {
        const p = processed && isKZ8AProcessed(processed) ? processed as KZ8AProcessed : null;
        return [
          { label: 'Напряжение сети', value: p ? Math.round(100 - p.electrical_supply_risk) : Math.min(100, Math.round((telemetry as KZ8ATelemetry).catenary_voltage_kv / 30 * 100)), color: '#e8943a' },
          { label: 'Статус пантографа', value: p ? Math.round(p.transformer_health_score) : Math.max(0, 100 - Math.round((telemetry as KZ8ATelemetry).main_transformer_temp_c / 120 * 100)), color: '#22d3ee' },
          { label: 'Трансформатор', value: p ? Math.round(p.traction_drive_health_score) : ((telemetry as KZ8ATelemetry).traction_drive_status === 'ok' ? 90 : 45), color: '#e879a8' },
          { label: 'Рекуперация', value: p ? Math.round(p.regen_efficiency_score) : Math.min(100, Math.round((telemetry as KZ8ATelemetry).regenerative_braking_power_kw / 500 * 100)), color: '#f5b946' },
          { label: 'Эфф. энергии', value: p ? Math.round(p.energy_efficiency_score) : 70, color: '#34d399' },
        ];
      })()
    : (() => {
        const p = processed && isTE33AProcessed(processed) ? processed as TE33AProcessed : null;
        return [
          { label: 'Напряжение сети', value: p ? Math.round(p.engine_health_score) : 100 - ((telemetry as TE33ATelemetry).engine_load_pct ?? 50), color: '#e8943a' },
          { label: 'Статус пантографа', value: p ? Math.round(p.fuel_efficiency_score) : ((telemetry as TE33ATelemetry).fuel_level_pct ?? 50), color: '#22d3ee' },
          { label: 'Трансформатор', value: p ? Math.round(p.propulsion_health_score) : ((telemetry as TE33ATelemetry).propulsion_system_status === 'ok' ? 90 : 45), color: '#e879a8' },
          { label: 'Рекуперация', value: p ? Math.round(100 - p.brake_risk) : Math.min(100, Math.round(((telemetry as TE33ATelemetry).brake_system_pressure_bar ?? 5) / 8 * 100)), color: '#f5b946' },
        ];
      })();

  // Diagnostic bars: all key numeric telemetry per model
  const diagRows = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? [
        { label: 'Трансформатор (темп.)', value: (telemetry as KZ8ATelemetry).main_transformer_temp_c, maxValue: 120, color: '#e8943a', unit: '°C' },
        { label: 'Нагрузка трансформатора', value: (telemetry as KZ8ATelemetry).main_transformer_load_pct, maxValue: 100, color: '#22d3ee', unit: '%' },
        { label: 'Напряжение контактной сети', value: (telemetry as KZ8ATelemetry).catenary_voltage_kv, maxValue: 30, color: '#3b82f6', unit: 'кВ' },
        { label: 'Ток контактной сети', value: (telemetry as KZ8ATelemetry).catenary_current_a, maxValue: 1000, color: '#f47e6c', unit: 'А' },
        { label: 'Давление тормозов', value: (telemetry as KZ8ATelemetry).brake_system_pressure_bar, maxValue: 8, color: '#e879a8', unit: 'бар' },
        { label: 'Конвертер (темп.)', value: (telemetry as KZ8ATelemetry).traction_converter_temp_c, maxValue: 100, color: '#c4a96a', unit: '°C' },
        { label: 'Нагрузка конвертера', value: (telemetry as KZ8ATelemetry).traction_converter_load_pct, maxValue: 100, color: '#f5b946', unit: '%' },
        { label: 'Потребление энергии', value: (telemetry as KZ8ATelemetry).energy_consumption_kw, maxValue: 1000, color: '#34d399', unit: 'кВт' },
      ]
    : [
        { label: 'Двигатель (нагрузка)', value: (telemetry as TE33ATelemetry).engine_load_pct, maxValue: 100, color: '#e8943a', unit: '%' },
        { label: 'Уровень топлива', value: (telemetry as TE33ATelemetry).fuel_level_pct, maxValue: 100, color: '#3b82f6', unit: '%' },
        { label: 'Расход топлива', value: (telemetry as TE33ATelemetry).fuel_consumption_lph, maxValue: 300, color: '#f47e6c', unit: 'л/ч' },
        { label: 'Динамический тормоз', value: (telemetry as TE33ATelemetry).brake_system_pressure_bar, maxValue: 8, color: '#f5b946', unit: 'бар' },
      ];

  const avgRadial = Math.round(radialSegments.reduce((s, seg) => s + seg.value, 0) / radialSegments.length);

  return (
    <div className="layout-driver animate-fade-in">
      {/* ── Left sidebar: Profile + Alerts ── */}
      <aside className="flex flex-col gap-1.5 overflow-hidden">
        {/* Compact profile */}
        <div className="panel flex items-center gap-2 px-3 py-2">
          <div className="driver-avatar flex-shrink-0">
            <img src="/header-logo.svg" alt="KTЖ" style={{ width: 20, height: 20 }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name ?? 'Машинист'}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>машинист</div>
          </div>
        </div>
        {/* Alerts */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AlertsPanel locomotiveId={locoId} />
        </div>
      </aside>

      {/* ── Main: 3-row grid filling viewport ── */}
      <div className="grid gap-1.5" style={{ gridTemplateRows: 'auto 1fr auto', overflow: 'hidden' }}>

        {/* ROW 1: Speed | Health | Risk | Route + Map */}
        <div className="grid grid-cols-12 gap-1.5" style={{ maxHeight: '30vh' }}>
          <div className="col-span-3">
            <SpeedGauge locoId={locoId} />
          </div>
          <div className="col-span-2">
            <SparklineKPI
              locoId={locoId}
              label="Средний health"
              metricKey="speed_kmh"
              value={`${hi}%`}
              color={hiStatus === 'Critical' ? '#ef4444' : hiStatus === 'Warning' ? '#f5b946' : '#34d399'}
              accent={hiStatus === 'Critical' ? 'kpi-card--critical' : hiStatus === 'Warning' ? 'kpi-card--amber' : 'kpi-card--normal'}
            />
          </div>
          <div className="col-span-2">
            <SparklineKPI
              locoId={locoId}
              label="Риск задержки"
              metricKey="brake_system_pressure_bar"
              value={`${Math.max(0, 100 - hi)}%`}
              color="#e8943a"
              accent="kpi-card--amber"
            />
          </div>
          <div className="col-span-5 grid gap-1.5" style={{ gridTemplateRows: '1fr 1fr' }}>
            <RouteContextWidget locoId={locoId} />
            <div className="panel overflow-hidden">
              <RailwayMap compact className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* ROW 2: BarChart | RadialHealth */}
        <div className="grid grid-cols-12 gap-1.5 min-h-0">
          <div className="col-span-7 min-h-0">
            <BarChartWidget locoId={locoId} tabs={barTabs} height={180} />
          </div>
          <div className="col-span-5 min-h-0">
            <RadialHealthChart
              segments={radialSegments}
              centerValue={avgRadial}
              size={130}
            />
          </div>
        </div>

        {/* ROW 3: Diagnostics | Metrics */}
        <div className="grid grid-cols-12 gap-1.5" style={{ maxHeight: '28vh' }}>
          <div className="col-span-4 overflow-auto">
            <DiagnosticBars
              title={`Состояние ${model}`}
              rows={diagRows}
            />
          </div>
          <div className="col-span-8 overflow-auto">
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
