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
        <div className="py-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
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

  const decisionClass =
    decision === 'Allow' ? 'status-badge--ok' : decision === 'Monitor' ? 'status-badge--degraded' : 'status-badge--fault';

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{entry.locomotive_id}</h3>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            {entry.locomotive_model}
          </span>
        </div>
        <div className={clsx('status-badge', decisionClass)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
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
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Communication</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot status={entry.communication_status === 'online' ? 'ok' : entry.communication_status === 'degraded' ? 'degraded' : 'fault'} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.communication_status}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {isKZ8AFleet(entry) && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Pantograph</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.pantograph_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.pantograph_status}</span></div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Transformer</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.main_transformer_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.main_transformer_status}</span></div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Traction Drive</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.traction_drive_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.traction_drive_status}</span></div>
            </div>
          </div>
        )}
        {isTE33AFleet(entry) && (
          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Engine</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.engine_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.engine_status}</span></div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fuel</div>
              <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{entry.fuel_level_pct.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Propulsion</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.propulsion_system_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.propulsion_system_status}</span></div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Dynamic Brake</div>
              <div className="mt-0.5 flex items-center gap-1"><StatusDot status={entry.dynamic_brake_status} /> <span style={{ color: 'var(--text-secondary)' }}>{entry.dynamic_brake_status}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
        {entry.operational_status_summary}
      </div>
      {entry.fault_code && (
        <div className="mt-2 text-xs font-medium" style={{ color: 'var(--status-critical)' }}>
          Fault: {entry.fault_code}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, good }: { label: string; value: number | string; good?: boolean }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div
        className="mt-0.5 font-semibold tabular-nums"
        style={{
          color:
            good === undefined
              ? 'var(--text-primary)'
              : good
                ? 'var(--status-normal)'
                : 'var(--status-warning)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
