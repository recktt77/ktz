import { useDashboardStore } from '@/store';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { AlertSeverity } from '@/types';

const severityClass: Record<AlertSeverity, string> = {
  critical: 'alert-item--critical',
  warning: 'alert-item--warning',
  info: 'alert-item--info',
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
    <div className="alert-rail">
      <div className="alert-rail__title">
        Оповещения
        {active.length > 0 && (
          <span className="alert-rail__count">{active.length}</span>
        )}
      </div>
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 360 }}>
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
            Нет оповещений
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                'alert-item',
                severityClass[alert.severity],
                alert.acknowledged && 'opacity-40',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="alert-item__title">
                  {alert.title}
                  <span className="ml-2" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {alert.locomotive_id}
                  </span>
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  {format(new Date(alert.timestamp_utc), 'HH:mm:ss')}
                </span>
              </div>
              <div className="alert-item__meta">{alert.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
