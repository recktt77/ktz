import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
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
      <Card>
        <div className="py-8 text-center text-sm text-gray-600">
          Waiting for fleet data…
        </div>
      </Card>
    );
  }

  const sorted = [...fleet].sort((a, b) => a.criticality_rank - b.criticality_rank);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">Locomotive</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Maint. Queue</th>
              <th className="px-4 py-3">Decision</th>
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
    </Card>
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
      className={clsx(
        'cursor-pointer border-b border-gray-800/50 transition-colors hover:bg-gray-800/50',
        selected && 'bg-gray-800/70',
      )}
    >
      <td className="px-4 py-3 font-medium text-white">{entry.locomotive_id}</td>
      <td className="px-4 py-3">
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium">
          {entry.locomotive_model}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            'font-bold tabular-nums',
            entry.health_index >= 80
              ? 'text-emerald-400'
              : entry.health_index >= 50
                ? 'text-amber-400'
                : 'text-red-400',
          )}
        >
          {entry.health_index}
        </span>
      </td>
      <td className="px-4 py-3">
        <ModelStatus entry={entry} />
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            'tabular-nums',
            entry.downtime_risk_score > 50
              ? 'text-red-400'
              : entry.downtime_risk_score > 25
                ? 'text-amber-400'
                : 'text-gray-400',
          )}
        >
          {entry.downtime_risk_score.toFixed(0)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400">#{entry.criticality_rank}</td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            decision === 'allow'
              ? 'bg-emerald-500/20 text-emerald-400'
              : decision === 'monitor'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400',
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
