import { useDashboardStore } from '@/store';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HealthCard } from '@/widgets/common/HealthCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { EngineerKZ8APanel } from '@/widgets/engineer/EngineerKZ8APanel';
import { EngineerTE33APanel } from '@/widgets/engineer/EngineerTE33APanel';
import { Skeleton } from '@/components/Skeleton';

export function EngineerDashboard() {
  const locoId = useDashboardStore((s) => s.selectedLocomotiveId);
  const telemetry = useTelemetry(locoId);

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

  return (
    <div className="space-y-4">
      {/* Health card */}
      <div className="max-w-sm">
        <HealthCard locoId={locoId} />
      </div>

      {/* Model-specific diagnostic panel */}
      {model === 'KZ8A' ? (
        <EngineerKZ8APanel locoId={locoId} />
      ) : (
        <EngineerTE33APanel locoId={locoId} />
      )}

      {/* Alerts */}
      <AlertsPanel locomotiveId={locoId} />
    </div>
  );
}
