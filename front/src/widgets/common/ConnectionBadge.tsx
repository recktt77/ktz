import { useDashboardStore } from '@/store';
import { format } from 'date-fns';
import clsx from 'clsx';

const cfg = {
  connected: { color: 'bg-emerald-500', text: 'Connected' },
  connecting: { color: 'bg-blue-500 animate-pulse', text: 'Connecting…' },
  reconnecting: { color: 'bg-amber-500 animate-pulse', text: 'Reconnecting…' },
  disconnected: { color: 'bg-red-500', text: 'Disconnected' },
};

export function ConnectionBadge() {
  const status = useDashboardStore((s) => s.connection.status);
  const lastMessageAt = useDashboardStore((s) => s.connection.lastMessageAt);
  const c = cfg[status];

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <span className={clsx('h-2 w-2 rounded-full', c.color)} />
        <span className="text-gray-300">{c.text}</span>
      </div>
      {lastMessageAt && (
        <span className="text-xs text-gray-500">
          {format(new Date(lastMessageAt), 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}
