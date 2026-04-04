import { useDashboardStore } from '@/store';
import { StatusDot } from '@/components/StatusDot';
import { isKZ8AFleet, isTE33AFleet } from '@/types';
import type { FleetEntry } from '@/types';
import clsx from 'clsx';

export function FleetTable() {
  const fleet = useDashboardStore((s) => s.fleet);
  const selectedId = useDashboardStore((s) => s.selectedLocomotiveId);
  const selectLocomotive = useDashboardStore((s) => s.selectLocomotive);

  if (fleet.length === 0) {
    return (
      <div className="panel p-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Waiting for fleet data…
      </div>
    );
  }

  const sorted = [...fleet].sort((a, b) => a.criticality_rank - b.criticality_rank);

  return (
    <div className="panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Locomotive</th>
              <th>Model</th>
              <th>Health</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Maint. Queue</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <FleetRow
                key={entry.locomotive_id}
                entry={entry}
                selected={entry.locomotive_id === selectedId}
                onSelect={() => selectLocomotive(entry.locomotive_id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FleetRow({
  entry,
  selected,
  onSelect,
}: {
  entry: FleetEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const decision = getDecision(entry);

  return (
    <tr
      onClick={onSelect}
      className={clsx(selected && 'selected')}
    >
      <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.locomotive_id}</td>
      <td>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
        >
          {entry.locomotive_model}
        </span>
      </td>
      <td>
        <span
          className="font-bold tabular-nums"
          style={{
            color:
              entry.health_index >= 80
                ? 'var(--status-normal)'
                : entry.health_index >= 50
                  ? 'var(--status-warning)'
                  : 'var(--status-critical)',
          }}
        >
          {entry.health_index}
        </span>
      </td>
      <td><ModelStatus entry={entry} /></td>
      <td>
        <span
          className="tabular-nums"
          style={{
            color:
              entry.downtime_risk_score > 50
                ? 'var(--status-critical)'
                : entry.downtime_risk_score > 25
                  ? 'var(--status-warning)'
                  : 'var(--text-muted)',
          }}
        >
          {entry.downtime_risk_score.toFixed(0)}
        </span>
      </td>
      <td style={{ color: 'var(--text-muted)' }}>#{entry.criticality_rank}</td>
      <td>
        <span
          className={clsx(
            'status-badge',
            decision === 'allow'
              ? 'status-badge--ok'
              : decision === 'monitor'
                ? 'status-badge--degraded'
                : 'status-badge--fault',
          )}
        >
          {decision}
        </span>
      </td>
    </tr>
  );
}

function ModelStatus({ entry }: { entry: FleetEntry }) {
  if (isKZ8AFleet(entry)) {
    return (
      <div className="flex items-center gap-2">
        <StatusDot status={entry.main_transformer_status} />
        <span className="text-xs text-gray-400">Pwr</span>
        <StatusDot status={entry.brake_system_status} />
        <span className="text-xs text-gray-400">Brk</span>
      </div>
    );
  }
  if (isTE33AFleet(entry)) {
    return (
      <div className="flex items-center gap-2">
        <StatusDot status={entry.engine_status} />
        <span className="text-xs text-gray-400">Eng</span>
        <StatusDot status={entry.brake_system_status} />
        <span className="text-xs text-gray-400">Brk</span>
        <span className="text-xs text-gray-500">{entry.fuel_level_pct.toFixed(0)}% fuel</span>
      </div>
    );
  }
  return null;
}

function getDecision(entry: FleetEntry): 'allow' | 'monitor' | 'remove' {
  if (entry.health_index >= 80 && entry.downtime_risk_score < 20) return 'allow';
  if (entry.health_index < 50 || entry.downtime_risk_score > 60) return 'remove';
  return 'monitor';
}
