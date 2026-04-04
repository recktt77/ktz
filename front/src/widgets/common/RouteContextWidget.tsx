import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';

interface Props {
  locoId: string | null;
}

export function RouteContextWidget({ locoId }: Props) {
  const route = useDashboardStore((s) =>
    locoId ? s.routes[locoId] ?? null : null,
  );

  if (!route) {
    return (
      <Card>
        <div className="kpi-card__label">Route</div>
        <div className="mt-4 py-4 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
          No route data
        </div>
      </Card>
    );
  }

  const progress = (route.position_km / route.totalKm) * 100;

  return (
    <Card>
      <div className="kpi-card__label mb-3">Route</div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{route.from}</span>
        <span style={{ color: 'var(--text-dim)' }}>→</span>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{route.to}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} color="cyan" />
      </div>
      <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{route.position_km.toFixed(1)} km</span>
        <span>{route.totalKm} km</span>
      </div>
      <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
        <span>
          Deviation:{' '}
          <span
            style={{
              color: route.schedule_deviation_min > 3
                ? 'var(--status-warning)'
                : 'var(--status-normal)',
            }}
          >
            {route.schedule_deviation_min > 0 ? '+' : ''}
            {route.schedule_deviation_min.toFixed(1)} min
          </span>
        </span>
        <span>ETA: {route.eta_to_checkpoint_min.toFixed(0)} min</span>
      </div>
    </Card>
  );
}
