import { useDashboardStore } from '@/store';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HealthCard } from '@/widgets/common/HealthCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { TelemetryChart } from '@/widgets/common/TelemetryChart';
import { DriverKZ8APanel } from '@/widgets/driver/DriverKZ8APanel';
import { DriverTE33APanel } from '@/widgets/driver/DriverTE33APanel';
import { Skeleton } from '@/components/Skeleton';

export function DriverDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);

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
  const chartMetrics =
    model === 'KZ8A'
      ? [
          { key: 'catenary_voltage_kv', color: '#3b82f6' },
          { key: 'main_transformer_temp_c', color: '#f59e0b' },
          { key: 'tractive_effort_kn', color: '#22d3ee' },
        ]
      : [
          { key: 'engine_rpm', color: '#3b82f6' },
          { key: 'fuel_consumption_lph', color: '#ef4444' },
          { key: 'speed_kmh', color: '#22d3ee' },
        ];

  return (
    <div className="space-y-4">
      {/* Health + model-specific panel */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">
          <HealthCard locoId={locoId} />
        </div>
        <div className="col-span-12 lg:col-span-9">
          {model === 'KZ8A' ? (
            <DriverKZ8APanel locoId={locoId} />
          ) : (
            <DriverTE33APanel locoId={locoId} />
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {chartMetrics.map((m) => (
          <TelemetryChart
            key={m.key}
            locoId={locoId}
            metricKey={m.key}
            color={m.color}
            height={160}
          />
        ))}
      </div>

      {/* Alerts */}
      <AlertsPanel locomotiveId={locoId} />
    </div>
  );
}
