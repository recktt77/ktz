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
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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

      {/* Component statuses */}
      <Card>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          System Status
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Engine" status={t.engine_status} />
          <Badge label="Propulsion" status={t.propulsion_system_status} />
          <Badge label="Dynamic Brake" status={t.dynamic_brake_status} />
          <Badge label="Compressor" status={t.compressor_status} />
          <Badge
            label="Communication"
            status={t.communications_status === 'online' ? 'ok' : t.communications_status === 'degraded' ? 'degraded' : 'fault'}
          />
        </div>
      </Card>

      {/* Fault + recommendation */}
      {(t.fault_code || p?.recommended_action) && (
        <Card className={t.fault_code ? 'border-red-500/30 bg-red-500/5' : ''}>
          {t.fault_code && (
            <div className="mb-2 text-sm font-semibold text-red-400">
              Active Fault: {t.fault_code}
            </div>
          )}
          {p?.recommended_action && (
            <div className="text-sm text-gray-300">{p.recommended_action}</div>
          )}
        </Card>
      )}
    </div>
  );
}
