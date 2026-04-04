import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { StatusDot } from '@/components/StatusDot';
import { isKZ8AFleet, isTE33AFleet } from '@/types';
import clsx from 'clsx';

export function LocomotiveDecisionCard() {
  const selectedId = useDashboardStore((s) => s.selectedLocomotiveId);
  const fleet = useDashboardStore((s) => s.fleet);
  const entry = fleet.find((e) => e.locomotive_id === selectedId);

  if (!entry) {
    return (
      <Card>
        <div className="py-8 text-center text-sm text-gray-600">
          Select a locomotive from the table above
        </div>
      </Card>
    );
  }

  const decision =
    entry.health_index >= 80 && entry.downtime_risk_score < 20
      ? 'Allow'
      : entry.health_index < 50 || entry.downtime_risk_score > 60
        ? 'Remove from service'
        : 'Monitor';

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{entry.locomotive_id}</h3>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
            {entry.locomotive_model}
          </span>
        </div>
        <div
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-bold',
            decision === 'Allow'
              ? 'bg-emerald-500/20 text-emerald-400'
              : decision === 'Monitor'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400',
          )}
        >
          {decision}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Health Index" value={entry.health_index} good={entry.health_index >= 80} />
        <Field label="Availability" value={`${entry.availability_score.toFixed(0)}%`} good={entry.availability_score > 80} />
        <Field label="Downtime Risk" value={entry.downtime_risk_score.toFixed(0)} good={entry.downtime_risk_score < 25} />
        <Field label="Maintenance Priority" value={entry.maintenance_priority_score.toFixed(0)} good={entry.maintenance_priority_score < 30} />
        <Field label="Criticality Rank" value={`#${entry.criticality_rank}`} />
        <div>
          <div className="text-xs text-gray-400">Communication</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot status={entry.communication_status === 'online' ? 'ok' : entry.communication_status === 'degraded' ? 'degraded' : 'fault'} />
            <span className="text-gray-200">{entry.communication_status}</span>
          </div>
        </div>
      </div>

      {/* Model-specific fields */}
      <div className="mt-4 border-t border-gray-800 pt-4">
        {isKZ8AFleet(entry) && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">Pantograph</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.pantograph_status} /> {entry.pantograph_status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Transformer</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.main_transformer_status} /> {entry.main_transformer_status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Traction Drive</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.traction_drive_status} /> {entry.traction_drive_status}</div>
            </div>
          </div>
        )}
        {isTE33AFleet(entry) && (
          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div>
              <div className="text-xs text-gray-400">Engine</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.engine_status} /> {entry.engine_status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Fuel</div>
              <div className="mt-0.5 text-gray-200">{entry.fuel_level_pct.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Propulsion</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.propulsion_system_status} /> {entry.propulsion_system_status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Dynamic Brake</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.dynamic_brake_status} /> {entry.dynamic_brake_status}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gray-800/50 px-3 py-2 text-sm text-gray-300">
        {entry.operational_status_summary}
      </div>
      {entry.fault_code && (
        <div className="mt-2 text-xs font-medium text-red-400">
          Fault: {entry.fault_code}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, good }: { label: string; value: number | string; good?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={clsx(
        'mt-0.5 font-semibold tabular-nums',
        good === undefined ? 'text-white' : good ? 'text-emerald-400' : 'text-amber-400',
      )}>
        {value}
      </div>
    </div>
  );
}
