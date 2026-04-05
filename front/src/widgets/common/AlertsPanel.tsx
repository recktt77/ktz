import { useDashboardStore } from '@/store';

interface Props {
  locomotiveId?: string | null;
}

export function AlertsPanel({ locomotiveId }: Props) {
  const allAlerts = useDashboardStore((s) => s.alerts);
  const alerts = locomotiveId
    ? allAlerts.filter((a) => a.locomotive_id === locomotiveId)
    : allAlerts;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.04)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      padding: '18px 16px',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {alerts.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#4a4238', fontSize: '0.82rem' }}>
          Нет оповещений
        </div>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              opacity: alert.acknowledged ? 0.3 : 1,
            }}
          >
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              fontStyle: 'italic',
              color: alert.severity === 'critical' ? '#e8943a'
                : alert.severity === 'warning' ? '#f5b946' : '#11b7e7',
              lineHeight: 1.5,
            }}>
              ! {alert.title}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
