import clsx from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  className?: string;
  color?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-cyan-500',
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-gray-800', className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
