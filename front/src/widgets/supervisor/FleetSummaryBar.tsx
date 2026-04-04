import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import clsx from 'clsx';

export function FleetSummaryBar() {
  const fleet = useDashboardStore((s) => s.fleet);

  const total = fleet.length;
  const good = fleet.filter((e) => e.health_index >= 80).length;
  const warning = fleet.filter((e) => e.health_index >= 50 && e.health_index < 80).length;
  const critical = fleet.filter((e) => e.health_index < 50).length;
  const avgHealth = total > 0 ? fleet.reduce((sum, e) => sum + e.health_index, 0) / total : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <SummaryTile label="Total Fleet" value={total} />
      <SummaryTile label="Good" value={good} color="text-emerald-400" />
      <SummaryTile label="Warning" value={warning} color="text-amber-400" />
      <SummaryTile label="Critical" value={critical} color="text-red-400" />
      <SummaryTile label="Avg Health" value={avgHealth.toFixed(0)} color={
        avgHealth >= 80 ? 'text-emerald-400' : avgHealth >= 50 ? 'text-amber-400' : 'text-red-400'
      } />
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <Card className="text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className={clsx('mt-1 text-3xl font-bold tabular-nums', color || 'text-white')}>
        {value}
      </div>
    </Card>
  );
}
