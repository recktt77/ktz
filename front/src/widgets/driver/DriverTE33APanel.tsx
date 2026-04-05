import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { MetricCard } from '@/widgets/common/MetricCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { isTE33ATelemetry, isTE33AProcessed } from '@/types';
import type { TE33ATelemetry } from '@/types';
import type { TE33AProcessed } from '@/types';

interface Props {
  locoId: string;
}

export function DriverTE33APanel({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!telemetry || !isTE33ATelemetry(telemetry)) return null;
  const t = telemetry as TE33ATelemetry;
  const p = processed && isTE33AProcessed(processed) ? (processed as TE33AProcessed) : null;

  return (
    <div className="space-y-1.5">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard metricKey="speed_kmh" value={t.speed_kmh} />
        <MetricCard
          metricKey="engine_rpm"
          value={t.engine_rpm}
          status={t.engine_status}
        />
        <MetricCard
          metricKey="engine_load_pct"
          value={t.engine_load_pct}
          status={t.engine_status}
        />
        <MetricCard
          metricKey="fuel_level_pct"
          value={t.fuel_level_pct}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
        <MetricCard
          metricKey="fuel_consumption_lph"
          value={t.fuel_consumption_lph}
        />
        <MetricCard
          metricKey="brake_system_pressure_bar"
          value={t.brake_system_pressure_bar}
          status={t.brake_system_status}
        />
        <MetricCard
          metricKey="dynamic_brake_status"
          value={t.dynamic_brake_status}
          status={t.dynamic_brake_status}
        />
      </div>

      {/* Component statuses — ALL systems */}
      <Card>
        <div className="kpi-card__label mb-2">Статус систем</div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Двигатель" status={t.engine_status} />
          <Badge label="Пропульсия" status={t.propulsion_system_status} />
          <Badge label="Дин. тормоз" status={t.dynamic_brake_status} />
          <Badge label="Тормозная сист." status={t.brake_system_status} />
          <Badge label="Компрессор" status={t.compressor_status} />
          <Badge label="Вспомогательные" status={t.auxiliaries_status} />
          <Badge label="Бортовая диагн." status={t.onboard_diagnostic_status} />
          <Badge label="Интерфейс экипажа" status={t.crew_interface_status} />
          <Badge label="Компьютер" status={t.computer_system_status} />
          <Badge label="Управление" status={t.control_system_status} />
          <Badge
            label="Связь"
            status={t.communications_status === 'online' ? 'ok' : t.communications_status === 'degraded' ? 'degraded' : 'fault'}
          />
        </div>
      </Card>

      {/* Remote diagnostic alert */}
      {t.remote_diagnostic_alert && (
        <Card className="panel--glow-warning">
          <div className="text-sm font-semibold" style={{ color: 'var(--status-warning)' }}>
            Удалённая диагностика: {t.remote_diagnostic_alert}
          </div>
        </Card>
      )}

      {/* Processed scores */}
      {p && (
        <Card>
          <div className="kpi-card__label mb-2">Аналитические показатели</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-3">
            <ScoreRow label="Двигатель" value={p.engine_health_score} />
            <ScoreRow label="Перегрузка двиг." value={100 - p.engine_overload_risk} />
            <ScoreRow label="Эфф. топлива" value={p.fuel_efficiency_score} />
            <ScoreRow label="Аномалия топлива" value={100 - p.fuel_anomaly_score} />
            <ScoreRow label="Пропульсия" value={p.propulsion_health_score} />
            <ScoreRow label="Дин. тормоз" value={p.dynamic_brake_availability_score} />
            <ScoreRow label="Риск тормозов" value={100 - p.brake_risk} />
            <ScoreRow label="Компрессор" value={p.compressor_readiness_score} />
            <ScoreRow label="Приоритет ТО" value={100 - p.maintenance_priority_score} />
          </div>
          {p.fuel_remaining_eta_h > 0 && (
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Запас топлива: ~{p.fuel_remaining_eta_h.toFixed(1)} ч
            </div>
          )}
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
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.recommended_action}</div>
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
