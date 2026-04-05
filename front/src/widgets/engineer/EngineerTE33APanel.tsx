import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { TelemetryChart } from '@/widgets/common/TelemetryChart';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { isTE33ATelemetry, isTE33AProcessed } from '@/types';
import type { TE33ATelemetry } from '@/types';
import type { TE33AProcessed } from '@/types';

interface Props {
  locoId: string;
}

export function EngineerTE33APanel({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!telemetry || !isTE33ATelemetry(telemetry)) return null;
  const t = telemetry as TE33ATelemetry;
  const p = processed && isTE33AProcessed(processed) ? (processed as TE33AProcessed) : null;

  return (
    <div className="space-y-4">
      {/* Component health scores */}
      {p && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <ScoreCard label="Engine Health" value={p.engine_health_score} />
          <ScoreCard label="Engine Overload Risk" value={p.engine_overload_risk} invert />
          <ScoreCard label="Fuel Efficiency" value={p.fuel_efficiency_score} />
          <ScoreCard label="Fuel Anomaly" value={p.fuel_anomaly_score} invert />
          <ScoreCard label="Propulsion Health" value={p.propulsion_health_score} />
          <ScoreCard label="Dynamic Brake Avail." value={p.dynamic_brake_availability_score} />
          <ScoreCard label="Brake Risk" value={p.brake_risk} invert />
          <ScoreCard label="Compressor Readiness" value={p.compressor_readiness_score} />
          <ScoreCard label="Maintenance Priority" value={p.maintenance_priority_score} invert />
        </div>
      )}

      {/* System status badges */}
      <Card>
        <div className="kpi-card__label mb-2">Subsystem Status</div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Engine" status={t.engine_status} />
          <Badge label="Propulsion" status={t.propulsion_system_status} />
          <Badge label="Dynamic Brake" status={t.dynamic_brake_status} />
          <Badge label="Compressor" status={t.compressor_status} />
          <Badge label="Onboard Diag." status={t.onboard_diagnostic_status} />
          <Badge label="Auxiliaries" status={t.auxiliaries_status} />
        </div>
        {t.remote_diagnostic_alert && (
          <div className="mt-2 rounded px-3 py-1.5 text-xs" style={{ background: 'rgba(245,185,70,0.08)', color: 'var(--status-warning)' }}>
            Remote diagnostic: {t.remote_diagnostic_alert}
          </div>
        )}
      </Card>

      {/* Diagnostic charts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        <TelemetryChart locoId={locoId} metricKey="engine_rpm" color="#3b82f6" />
        <TelemetryChart locoId={locoId} metricKey="engine_load_pct" color="#f59e0b" />
        <TelemetryChart locoId={locoId} metricKey="fuel_consumption_lph" color="#ef4444" />
        <TelemetryChart locoId={locoId} metricKey="brake_system_pressure_bar" color="#a78bfa" />
      </div>

      {/* Root cause analysis */}
      {p && p.root_cause_candidates.length > 0 && (
        <Card>
          <div className="kpi-card__label mb-3">Root Cause Analysis</div>
          <div className="space-y-3">
            {p.root_cause_candidates.map((rc, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 rounded px-1.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--status-critical)' }}>
                  {(rc.probability * 100).toFixed(0)}%
                </span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {rc.component.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{rc.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top factors */}
      {p && p.top_factors.length > 0 && (
        <Card>
          <div className="kpi-card__label mb-3">Top Contributing Factors</div>
          <div className="space-y-2">
            {p.top_factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>{f.detail}</span>
                <span className="font-bold" style={{ color: 'var(--status-critical)' }}>{f.impact}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Maintenance recommendation */}
      {p?.recommended_maintenance_action && (
        <Card className="panel--glow-warning">
          <div className="kpi-card__label mb-1" style={{ color: 'var(--status-warning)' }}>
            Maintenance Recommendation
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {p.recommended_maintenance_action}
          </div>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const isGood = invert ? value < 30 : value > 70;
  const isBad = invert ? value > 60 : value < 40;

  return (
    <div className="score-card">
      <div className="score-card__label">{label}</div>
      <div
        className="score-card__value"
        style={{
          color: isBad ? 'var(--status-critical)' : isGood ? 'var(--status-normal)' : 'var(--status-warning)',
        }}
      >
        {value.toFixed(0)}
      </div>
    </div>
  );
}
