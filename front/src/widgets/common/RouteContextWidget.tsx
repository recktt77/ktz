import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { format } from 'date-fns';
import type { RouteContext as RouteContextType } from '@/types';

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
        <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Route
        </div>
        <div className="mt-4 py-4 text-center text-sm text-gray-600">
          No route data
        </div>
      </Card>
    );
  }

  const progress = (route.position_km / route.totalKm) * 100;

  return (
    <Card>
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
        Route
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">{route.from}</span>
        <span className="text-gray-500">→</span>
        <span className="font-medium text-white">{route.to}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>{route.position_km.toFixed(1)} km</span>
        <span>{route.totalKm} km</span>
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>
          Deviation:{' '}
          <span
            className={
              route.schedule_deviation_min > 3
                ? 'text-amber-400'
                : 'text-emerald-400'
            }
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
