import clsx from 'clsx';
import type { ComponentStatus } from '@/types';

interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  status?: ComponentStatus;
  variant?: 'emerald' | 'amber' | 'red' | 'blue' | 'gray';
  className?: string;
}

const variants: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/20 text-amber-400',
  red: 'bg-red-500/20 text-red-400',
  blue: 'bg-blue-500/20 text-blue-400',
  gray: 'bg-gray-500/20 text-gray-400',
};

const statusToVariant: Record<ComponentStatus, string> = {
  ok: 'emerald',
  degraded: 'amber',
  fault: 'red',
  offline: 'gray',
};

export function Badge({ children, label, status, variant, className }: BadgeProps) {
  const resolvedVariant = variant ?? (status ? statusToVariant[status] : 'gray');

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        variants[resolvedVariant],
        className,
      )}
    >
      {label ?? children}
    </span>
  );
}
