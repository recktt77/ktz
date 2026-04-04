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
    <div className="space-y-4">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {/* Component statuses */}
      <Card>
        <div className="kpi-card__label mb-2">System Status</div>
        <div className="flex flex-wrap gap-2">
          <Badge
            label="Pantograph"
            status={t.pantograph_status}
          />
          <Badge
            label="Transformer"
            status={t.main_transformer_status}
          />
          <Badge
            label="Traction Drive"
            status={t.traction_drive_status}
          />
          <Badge
            label="Converter"
            status={t.traction_converter_status}
          />
          <Badge
            label="Regen Brake"
            status={t.regenerative_braking_status}
          />
          <Badge
            label="Communication"
            status={t.communication_status === 'online' ? 'ok' : t.communication_status === 'degraded' ? 'degraded' : 'fault'}
          />
        </div>
      </Card>

      {/* Fault + recommendation */}
      {(t.fault_code || p?.recommended_action) && (
        <Card
          className={
            t.fault_code ? 'panel--glow-critical' : ''
          }
        >
          {t.fault_code && (
            <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--status-critical)' }}>
              Active Fault: {t.fault_code}
            </div>
          )}
          {p?.recommended_action && (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {p.recommended_action}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
