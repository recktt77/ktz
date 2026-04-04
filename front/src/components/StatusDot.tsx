import clsx from 'clsx';

type Status = 'ok' | 'online' | 'normal' | 'degraded' | 'warning' | 'fault' | 'critical' | 'offline';

const colors: Record<Status, string> = {
  ok: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  online: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  normal: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  degraded: 'bg-amber-400 shadow-[0_0_6px_rgba(245,185,70,0.5)] animate-pulse',
  warning: 'bg-amber-400 shadow-[0_0_6px_rgba(245,185,70,0.5)] animate-pulse',
  fault: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse',
  critical: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse',
  offline: 'bg-gray-500',
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-block h-2 w-2 rounded-full',
        colors[status as Status] ?? 'bg-gray-500',
      )}
    />
  );
}
