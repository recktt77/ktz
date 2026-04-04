import clsx from 'clsx';

type Status = 'ok' | 'online' | 'normal' | 'degraded' | 'warning' | 'fault' | 'critical' | 'offline';

const colors: Record<Status, string> = {
  ok: 'bg-emerald-400',
  online: 'bg-emerald-400',
  normal: 'bg-emerald-400',
  degraded: 'bg-amber-400 animate-pulse',
  warning: 'bg-amber-400 animate-pulse',
  fault: 'bg-red-500 animate-pulse',
  critical: 'bg-red-500 animate-pulse',
  offline: 'bg-gray-500',
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-block h-2.5 w-2.5 rounded-full',
        colors[status as Status] ?? 'bg-gray-500',
      )}
    />
  );
}
