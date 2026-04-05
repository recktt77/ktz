import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { MetricCard } from '@/widgets/common/MetricCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { isKZ8ATelemetry, isKZ8AProcessed } from '@/types';
import type { KZ8ATelemetry } from '@/types';
import type { KZ8AProcessed } from '@/types';

interface Props {
  locoId: string;
}

export function DriverKZ8APanel({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!telemetry || !isKZ8ATelemetry(telemetry)) return null;
  const t = telemetry as KZ8ATelemetry;
  const p = processed && isKZ8AProcessed(processed) ? (processed as KZ8AProcessed) : null;

  return (
    <div className="space-y-1.5">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <MetricCard metricKey="speed_kmh" value={t.speed_kmh} />
        <MetricCard
          metricKey="tractive_effort_kn"
          value={t.tractive_effort_kn}
          status={t.traction_drive_status}
        />
        <MetricCard
          metricKey="catenary_voltage_kv"
          value={t.catenary_voltage_kv}
          status={t.pantograph_status}
        />
        <MetricCard
          metricKey="brake_system_pressure_bar"
          value={t.brake_system_pressure_bar}
          status={t.brake_system_status}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <MetricCard
          metricKey="catenary_current_a"
          value={t.catenary_current_a}
        />
        <MetricCard
          metricKey="main_transformer_temp_c"
          value={t.main_transformer_temp_c}
          status={t.main_transformer_status}
        />
        <MetricCard
          metricKey="main_transformer_load_pct"
          value={t.main_transformer_load_pct}
          status={t.main_transformer_status}
        />
        <MetricCard
          metricKey="regenerative_braking_power_kw"
          value={t.regenerative_braking_power_kw}
          status={t.regenerative_braking_status}
        />
      </div>

      {/* Tertiary metrics */}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <MetricCard
          metricKey="traction_converter_temp_c"
          value={t.traction_converter_temp_c}
          status={t.traction_converter_status}
        />
        <MetricCard
          metricKey="traction_converter_load_pct"
          value={t.traction_converter_load_pct}
          status={t.traction_converter_status}
        />
        <MetricCard
          metricKey="energy_consumption_kw"
          value={t.energy_consumption_kw}
        />
        <MetricCard
          metricKey="energy_meter_kwh"
          value={t.energy_meter_kwh}
        />
      </div>

      {/* Component statuses */}
      <Card>
        <div className="kpi-card__label mb-2">Статус систем</div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Пантограф" status={t.pantograph_status} />
          <Badge label="Трансформатор" status={t.main_transformer_status} />
          <Badge label="Тяговый привод" status={t.traction_drive_status} />
          <Badge label="Конвертер" status={t.traction_converter_status} />
          <Badge label="Рекуперация" status={t.regenerative_braking_status} />
          <Badge label="Эл. тормоз" status={t.electrical_brake_status} />
          <Badge label="Автопилот" status={t.automatic_pilot_status} />
          <Badge label="Управление" status={t.control_system_status} />
          <Badge
            label="Связь"
            status={t.communication_status === 'online' ? 'ok' : t.communication_status === 'degraded' ? 'degraded' : 'fault'}
          />
        </div>
      </Card>

      {/* Processed scores */}
      {p && (
        <Card>
          <div className="kpi-card__label mb-2">Аналитические показатели</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-3">
            <ScoreRow label="Электроснабжение" value={100 - p.electrical_supply_risk} />
            <ScoreRow label="Трансформатор" value={p.transformer_health_score} />
            <ScoreRow label="Терм. риск трансф." value={100 - p.transformer_thermal_risk} />
            <ScoreRow label="Тяговый привод" value={p.traction_drive_health_score} />
            <ScoreRow label="Терм. риск конв." value={100 - p.converter_thermal_risk} />
            <ScoreRow label="Эфф. рекуперации" value={p.regen_efficiency_score} />
            <ScoreRow label="Риск тормозов" value={100 - p.brake_risk} />
            <ScoreRow label="Эфф. энергии" value={p.energy_efficiency_score} />
            <ScoreRow label="Приоритет ТО" value={100 - p.maintenance_priority_score} />
          </div>
        </Card>
      )}

      {/* Fault + recommendation */}
      {(t.fault_code || p?.recommended_action) && (
        <Card className={t.fault_code ? 'panel--glow-critical' : ''}>
          {t.fault_code && (
            <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--status-critical)' }}>
              Активная неисправность: {t.fault_code}
            </div>
          )}
          {p?.recommended_action && (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {p.recommended_action}
            </div>
          )}
          {p?.recommended_maintenance_action && (
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              ТО: {p.recommended_maintenance_action}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  const color = v > 70 ? 'var(--status-normal)' : v > 40 ? 'var(--status-warning)' : 'var(--status-critical)';
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="font-bold tabular-nums" style={{ color }}>{v}%</span>
    </div>
  );
}
