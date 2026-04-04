import { useProcessed } from '@/hooks/useTelemetry';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import clsx from 'clsx';

const styles = {
  Good: { text: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
  Warning: { text: 'text-amber-400', bg: 'from-amber-500/10 to-transparent' },
  Critical: { text: 'text-red-500', bg: 'from-red-500/10 to-transparent' },
};

interface Props {
  locoId: string | null;
  compact?: boolean;
}

export function HealthCard({ locoId, compact }: Props) {
  const processed = useProcessed(locoId);

  if (!processed) return <Skeleton className="h-40 rounded-2xl" />;

  const s = styles[processed.health_status];

  return (
    <Card className={clsx('relative overflow-hidden bg-gradient-to-br', s.bg)}>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        Health Index
      </div>
      <div
        className={clsx(
          'mt-2 font-bold tabular-nums',
          s.text,
          compact ? 'text-3xl' : 'text-5xl',
        )}
      >
        {processed.health_index}
      </div>
      <div className={clsx('mt-1 text-sm font-semibold', s.text)}>
        {processed.health_status}
      </div>
      {!compact && 'recommended_action' in processed && (
        <div className="mt-3 text-xs leading-relaxed text-gray-400">
          {(processed as { recommended_action: string }).recommended_action}
        </div>
      )}
    </Card>
  );
}
