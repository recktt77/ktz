import { Card } from '@/components/Card';
import { StatusDot } from '@/components/StatusDot';
import { METRIC_LABELS, METRIC_UNITS } from '@/lib/constants';
import clsx from 'clsx';
import type { ComponentStatus } from '@/types';

interface Props {
  metricKey: string;
  value: number | string;
  status?: ComponentStatus;
  compact?: boolean;
}

export function MetricCard({ metricKey, value, status, compact }: Props) {
  const label = METRIC_LABELS[metricKey] || metricKey.replace(/_/g, ' ');
  const unit = METRIC_UNITS[metricKey] || '';

  return (
    <Card className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 truncate">
          {label}
        </span>
        {status && <StatusDot status={status} />}
      </div>
      <div
        className={clsx(
          'mt-1 font-bold tabular-nums',
          compact ? 'text-xl' : 'text-2xl',
          status === 'fault'
            ? 'text-red-400'
            : status === 'degraded'
              ? 'text-amber-400'
              : 'text-white',
        )}
      >
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </div>
    </Card>
  );
}
