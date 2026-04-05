import { useProcessed } from '@/hooks/useTelemetry';
import { Skeleton } from '@/components/Skeleton';
import clsx from 'clsx';

const styles = {
  Good: { text: 'color: var(--status-normal)', glow: 'panel--glow-normal', accent: '--status-normal' },
  Warning: { text: 'color: var(--status-warning)', glow: 'panel--glow-warning', accent: '--status-warning' },
  Critical: { text: 'color: var(--status-critical)', glow: 'panel--glow-critical', accent: '--status-critical' },
};

interface Props {
  locoId: string | null;
  compact?: boolean;
}

export function HealthCard({ locoId, compact }: Props) {
  const processed = useProcessed(locoId);

  if (!processed) return <Skeleton className="h-40 rounded-2xl" />;

  const s = styles[processed.health_status];
  const pct = processed.health_index;

  // SVG ring gauge
  const size = compact ? 100 : 130;
  const stroke = compact ? 8 : 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={clsx('panel p-5 flex flex-col items-center justify-center', s.glow)} style={{ height: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`var(${s.accent})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px var(${s.accent}))` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: `var(${s.accent})`, fontSize: compact ? '1.8rem' : '2.4rem', fontWeight: 800, lineHeight: 1 }}>
            {pct}
          </span>
          <span style={{ color: `var(${s.accent})`, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7, marginTop: 4 }}>
            {processed.health_status}
          </span>
        </div>
      </div>
      {!compact && 'recommended_action' in processed && (
        <div className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 200 }}>
          {(processed as { recommended_action: string }).recommended_action}
        </div>
      )}
    </div>
  );
}
