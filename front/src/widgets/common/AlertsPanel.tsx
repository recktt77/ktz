import { useDashboardStore } from '@/store';
import type { AlertSeverity } from '@/types';

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
      <div className="space-y-0.5" style={{ overflowY: 'auto', flex: 1 }}>
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
            Нет оповещений
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="py-1.5"
              style={{ opacity: alert.acknowledged ? 0.35 : 1 }}
            >
              <span
                className="text-sm font-semibold"
                style={{
                  color: alert.severity === 'critical'
                    ? '#e8943a'
                    : alert.severity === 'warning'
                      ? '#f5b946'
                      : 'var(--accent-cyan)',
                }}
              >
                ! {alert.title}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
