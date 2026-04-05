import { useDashboardStore } from '@/store';
import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { SpeedGauge } from '@/widgets/common/SpeedGauge';
import { SparklineKPI } from '@/widgets/common/SparklineKPI';
import { BarChartWidget } from '@/widgets/common/BarChartWidget';
import { RadialHealthChart } from '@/widgets/common/RadialHealthChart';
import { DiagnosticBars } from '@/widgets/common/DiagnosticBars';
import { RailwayMap } from '@/widgets/map';
import { Skeleton } from '@/components/Skeleton';
import { isKZ8ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';
import type { KZ8ATelemetry, TE33ATelemetry, KZ8AProcessed, TE33AProcessed } from '@/types';

export function DriverDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!locoId || !telemetry) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} className="rounded-[20px] h-[190px]" />)}
          </div>
          <Skeleton className="rounded-[20px] h-[190px]" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16 }}>
          <Skeleton className="rounded-[20px] h-[380px]" />
          <Skeleton className="rounded-[20px] h-[380px]" />
        </div>
        <Skeleton className="rounded-[20px] h-[180px]" />
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
          { key: 'tractive_effort_kn', label: 'Тяговое усилие', color: '#11b7e7' },
          { key: 'catenary_current_a', label: 'Ток сети', color: '#f48686' },
          { key: 'energy_consumption_kw', label: 'Потребление', color: '#e9b8a8' },
        ]},
        { id: 'brake', label: 'Тормоза', metrics: [
          { key: 'brake_system_pressure_bar', label: 'Давление', color: '#11b7e7' },
          { key: 'regenerative_braking_power_kw', label: 'Рекуперация', color: '#f48686' },
        ]},
        { id: 'mode', label: 'Режим движения', metrics: [
          { key: 'speed_kmh', label: 'Скорость', color: '#11b7e7' },
          { key: 'catenary_voltage_kv', label: 'Напряжение', color: '#f48686' },
        ]},
      ]
    : [
        { id: 'traction', label: 'Тяга', metrics: [
          { key: 'engine_rpm', label: 'Обороты', color: '#11b7e7' },
          { key: 'engine_load_pct', label: 'Нагрузка', color: '#f48686' },
        ]},
        { id: 'brake', label: 'Тормоза', metrics: [
          { key: 'brake_system_pressure_bar', label: 'Давление', color: '#11b7e7' },
          { key: 'fuel_consumption_lph', label: 'Расход топлива', color: '#e9b8a8' },
        ]},
        { id: 'mode', label: 'Режим движения', metrics: [
          { key: 'speed_kmh', label: 'Скорость', color: '#11b7e7' },
          { key: 'fuel_level_pct', label: 'Топливо', color: '#f48686' },
        ]},
      ];

  // Radial chart segments
  const radialSegments = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? (() => {
        const p = processed && isKZ8AProcessed(processed) ? processed as KZ8AProcessed : null;
        return [
          { label: 'Напряжение сети', value: p ? Math.round(100 - p.electrical_supply_risk) : Math.min(100, Math.round((telemetry as KZ8ATelemetry).catenary_voltage_kv / 30 * 100)), color: '#e8943a' },
          { label: 'Статус пантографа', value: p ? Math.round(p.transformer_health_score) : Math.max(0, 100 - Math.round((telemetry as KZ8ATelemetry).main_transformer_temp_c / 120 * 100)), color: '#11b7e7' },
          { label: 'Трансформатор', value: p ? Math.round(p.traction_drive_health_score) : ((telemetry as KZ8ATelemetry).traction_drive_status === 'ok' ? 90 : 45), color: '#e879a8' },
          { label: 'Рекуперация', value: p ? Math.round(p.regen_efficiency_score) : Math.min(100, Math.round((telemetry as KZ8ATelemetry).regenerative_braking_power_kw / 500 * 100)), color: '#dce6a0' },
        ];
      })()
    : (() => {
        const p = processed && isTE33AProcessed(processed) ? processed as TE33AProcessed : null;
        return [
          { label: 'Напряжение сети', value: p ? Math.round(p.engine_health_score) : 100 - ((telemetry as TE33ATelemetry).engine_load_pct ?? 50), color: '#e8943a' },
          { label: 'Статус пантографа', value: p ? Math.round(p.fuel_efficiency_score) : ((telemetry as TE33ATelemetry).fuel_level_pct ?? 50), color: '#11b7e7' },
          { label: 'Трансформатор', value: p ? Math.round(p.propulsion_health_score) : ((telemetry as TE33ATelemetry).propulsion_system_status === 'ok' ? 90 : 45), color: '#e879a8' },
          { label: 'Рекуперация', value: p ? Math.round(100 - p.brake_risk) : Math.min(100, Math.round(((telemetry as TE33ATelemetry).brake_system_pressure_bar ?? 5) / 8 * 100)), color: '#dce6a0' },
        ];
      })();

  // Diagnostic bars
  const diagRows = model === 'KZ8A' && isKZ8ATelemetry(telemetry)
    ? [
        { label: 'Трансформатор (темп.)', value: (telemetry as KZ8ATelemetry).main_transformer_temp_c, maxValue: 120, color: '#e9b8a8', unit: '°C' },
        { label: 'Напряжение контактной сети', value: (telemetry as KZ8ATelemetry).catenary_voltage_kv, maxValue: 30, color: '#11b7e7', unit: 'кВ' },
        { label: 'Ток контактной сети', value: (telemetry as KZ8ATelemetry).catenary_current_a, maxValue: 1000, color: '#f48686', unit: 'А' },
        { label: 'Давление тормозов', value: (telemetry as KZ8ATelemetry).brake_system_pressure_bar, maxValue: 8, color: '#e8943a', unit: 'бар' },
      ]
    : [
        { label: 'Двигатель (нагрузка)', value: (telemetry as TE33ATelemetry).engine_load_pct, maxValue: 100, color: '#e9b8a8', unit: '%' },
        { label: 'Уровень топлива', value: (telemetry as TE33ATelemetry).fuel_level_pct, maxValue: 100, color: '#11b7e7', unit: '%' },
        { label: 'Расход топлива', value: (telemetry as TE33ATelemetry).fuel_consumption_lph, maxValue: 300, color: '#f48686', unit: 'л/ч' },
        { label: 'Динамический тормоз', value: (telemetry as TE33ATelemetry).brake_system_pressure_bar, maxValue: 8, color: '#e8943a', unit: 'бар' },
      ];

  const avgRadial = Math.round(radialSegments.reduce((s, seg) => s + seg.value, 0) / radialSegments.length);

  return (
    <div className="animate-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '1.8fr 1fr',
      gridTemplateRows: 'auto 1fr auto',
      gap: 16,
      padding: '16px 20px',
      minHeight: '100vh',
      boxSizing: 'border-box',
    }}>
      {/* TOP-LEFT: 3 KPI cards — independent row height */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        alignSelf: 'start',
      }}>
        <div style={{ height: 190 }}>
          <SpeedGauge locoId={locoId} />
        </div>
        <div style={{ height: 190 }}>
          <SparklineKPI
            locoId={locoId}
            label="Средний health"
            metricKey="speed_kmh"
            value={`${hi}%`}
            color={hiStatus === 'Critical' ? '#ef4444' : hiStatus === 'Warning' ? '#f5b946' : '#bdd18f'}
            accent={hiStatus === 'Critical' ? 'kpi-card--critical' : hiStatus === 'Warning' ? 'kpi-card--amber' : ''}
          />
        </div>
        <div style={{ height: 190 }}>
          <SparklineKPI
            locoId={locoId}
            label="Риск задержки"
            metricKey="brake_system_pressure_bar"
            value={`${Math.max(0, 100 - hi)}%`}
            color="#11b7e7"
            accent=""
          />
        </div>
      </div>

      {/* TOP-RIGHT + MID-RIGHT: Маршрут — spans rows 1 & 2 */}
      <div style={{
        gridRow: '1 / 3',
        gridColumn: 2,
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, flexShrink: 0 }}>
          Маршрут
        </div>
        <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>
          <RailwayMap compact hideFilter className="w-full h-full" />
        </div>
      </div>

      {/* MID-LEFT: Управление движением */}
      <div style={{ minHeight: 380 }}>
        <BarChartWidget locoId={locoId} tabs={barTabs} />
      </div>

      {/* BOTTOM: diagnostics + radial — full width */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: '1.8fr 1fr',
        gap: 16,
      }}>
        <DiagnosticBars
          title={`Состояние ${model}`}
          rows={diagRows}
        />
        <RadialHealthChart
          segments={radialSegments}
          centerValue={avgRadial}
          size={170}
        />
      </div>
    </div>
  );
}
