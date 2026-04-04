import { useDashboardStore } from '@/store';
import { format } from 'date-fns';

const cfg = {
  connected: { color: 'var(--status-normal)', shadow: '0 0 6px rgba(52,211,153,0.4)', text: 'Connected' },
  connecting: { color: 'var(--accent-blue)', shadow: '0 0 6px rgba(59,130,246,0.4)', text: 'Connecting…' },
  reconnecting: { color: 'var(--status-warning)', shadow: '0 0 6px rgba(245,185,70,0.4)', text: 'Reconnecting…' },
  disconnected: { color: 'var(--status-critical)', shadow: '0 0 6px rgba(239,68,68,0.4)', text: 'Disconnected' },
};

export function ConnectionBadge() {
  const status = useDashboardStore((s) => s.connection.status);
  const lastMessageAt = useDashboardStore((s) => s.connection.lastMessageAt);
  const c = cfg[status];

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: c.color, boxShadow: c.shadow }}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{c.text}</span>
      </div>
      {lastMessageAt && (
        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
          {format(new Date(lastMessageAt), 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}
