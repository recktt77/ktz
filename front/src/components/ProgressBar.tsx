import clsx from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  className?: string;
  color?: 'cyan' | 'coral' | 'normal' | 'warning' | 'critical';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'cyan',
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={clsx('progress-bar', className)}>
      <div
        className={`progress-bar__fill progress-bar__fill--${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
