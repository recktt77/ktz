import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { AlertSeverity } from '@/types';

const severityStyles: Record<AlertSeverity, string> = {
  critical: 'border-l-red-500 bg-red-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
};

interface Props {
  locomotiveId?: string | null;
}

export function AlertsPanel({ locomotiveId }: Props) {
  const allAlerts = useDashboardStore((s) => s.alerts);
  const alerts = locomotiveId
    ? allAlerts.filter((a) => a.locomotive_id === locomotiveId)
    : allAlerts;
  const active = alerts.filter((a) => !a.acknowledged);

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Alerts
        </h2>
        {active.length > 0 && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
            {active.length}
          </span>
        )}
      </div>
      <div
        className="flex-1 space-y-2 overflow-y-auto scrollbar-thin"
        style={{ maxHeight: 300 }}
      >
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-600">
            No alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                'rounded-lg border-l-4 px-3 py-2',
                severityStyles[alert.severity],
                alert.acknowledged && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">
                  {alert.title}
                  <span className="ml-2 text-xs text-gray-500">
                    {alert.locomotive_id}
                  </span>
                </span>
                <span className="text-xs text-gray-500">
                  {format(new Date(alert.timestamp_utc), 'HH:mm:ss')}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-gray-400">
                {alert.message}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
