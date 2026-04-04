import { useDashboardStore } from '@/store';
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
      <SummaryTile label="Total Fleet" value={total} accent="kpi-card--cyan" />
      <SummaryTile label="Good" value={good} accent="kpi-card--normal" color="var(--status-normal)" />
      <SummaryTile label="Warning" value={warning} accent="kpi-card--amber" color="var(--status-warning)" />
      <SummaryTile label="Critical" value={critical} accent="kpi-card--critical" color="var(--status-critical)" />
      <SummaryTile
        label="Avg Health"
        value={avgHealth.toFixed(0)}
        accent={avgHealth >= 80 ? 'kpi-card--normal' : avgHealth >= 50 ? 'kpi-card--amber' : 'kpi-card--critical'}
        color={avgHealth >= 80 ? 'var(--status-normal)' : avgHealth >= 50 ? 'var(--status-warning)' : 'var(--status-critical)'}
      />
    </div>
  );
}

function SummaryTile({ label, value, accent, color }: { label: string; value: number | string; accent: string; color?: string }) {
  return (
    <div className={clsx('kpi-card text-center', accent)}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
