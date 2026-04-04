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

const statusAccent: Record<string, string> = {
  fault: 'kpi-card--critical',
  degraded: 'kpi-card--warning',
  ok: 'kpi-card--cyan',
};

export function MetricCard({ metricKey, value, status, compact }: Props) {
  const label = METRIC_LABELS[metricKey] || metricKey.replace(/_/g, ' ');
  const unit = METRIC_UNITS[metricKey] || '';
  const accent = status ? (statusAccent[status] || 'kpi-card--cyan') : 'kpi-card--cyan';

  return (
    <div className={clsx('kpi-card', accent)}>
      <div className="flex items-center justify-between gap-2">
        <span className="kpi-card__label truncate">{label}</span>
        {status && <StatusDot status={status} />}
      </div>
      <div className={clsx('kpi-card__value', compact ? 'text-xl!' : '')}>
        <span
          style={{
            color:
              status === 'fault'
                ? 'var(--status-critical)'
                : status === 'degraded'
                  ? 'var(--status-warning)'
                  : 'var(--text-primary)',
          }}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="kpi-card__unit">{unit}</span>
      </div>
    </div>
  );
}
