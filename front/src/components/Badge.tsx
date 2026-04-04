import clsx from 'clsx';
import type { ComponentStatus } from '@/types';

interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  status?: ComponentStatus;
  variant?: 'emerald' | 'amber' | 'red' | 'blue' | 'gray';
  className?: string;
}

const variantToClass: Record<string, string> = {
  emerald: 'status-badge--ok',
  amber: 'status-badge--degraded',
  red: 'status-badge--fault',
  blue: 'status-badge--ok',
  gray: 'status-badge--offline',
};

const statusToClass: Record<ComponentStatus, string> = {
  ok: 'status-badge--ok',
  degraded: 'status-badge--degraded',
  fault: 'status-badge--fault',
  offline: 'status-badge--offline',
};

export function Badge({ children, label, status, variant, className }: BadgeProps) {
  const cls = variant ? variantToClass[variant] : status ? statusToClass[status] : 'status-badge--offline';

  return (
    <span className={clsx('status-badge', cls, className)}>
      {label ?? children}
    </span>
  );
}
