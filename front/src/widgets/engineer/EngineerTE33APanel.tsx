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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          Subsystem Status
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label="Engine" status={t.engine_status} />
          <Badge label="Propulsion" status={t.propulsion_system_status} />
          <Badge label="Dynamic Brake" status={t.dynamic_brake_status} />
          <Badge label="Compressor" status={t.compressor_status} />
          <Badge label="Onboard Diag." status={t.onboard_diagnostic_status} />
          <Badge label="Auxiliaries" status={t.auxiliaries_status} />
        </div>
        {t.remote_diagnostic_alert && (
          <div className="mt-2 rounded bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
            Remote diagnostic: {t.remote_diagnostic_alert}
          </div>
        )}
      </Card>

      {/* Diagnostic charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TelemetryChart locoId={locoId} metricKey="engine_rpm" color="#3b82f6" />
        <TelemetryChart locoId={locoId} metricKey="engine_load_pct" color="#f59e0b" />
        <TelemetryChart locoId={locoId} metricKey="fuel_consumption_lph" color="#ef4444" />
        <TelemetryChart locoId={locoId} metricKey="brake_system_pressure_bar" color="#a78bfa" />
      </div>

      {/* Root cause analysis */}
      {p && p.root_cause_candidates.length > 0 && (
        <Card>
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
            Root Cause Analysis
          </div>
          <div className="space-y-3">
            {p.root_cause_candidates.map((rc, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-bold text-red-400">
                  {(rc.probability * 100).toFixed(0)}%
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    {rc.component.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-400">{rc.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top factors */}
      {p && p.top_factors.length > 0 && (
        <Card>
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
            Top Contributing Factors
          </div>
          <div className="space-y-2">
            {p.top_factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{f.detail}</span>
                <span className="font-bold text-red-400">{f.impact}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Maintenance recommendation */}
      {p?.recommended_maintenance_action && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-amber-400">
            Maintenance Recommendation
          </div>
          <div className="text-sm text-gray-300">
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
    <Card className="py-3">
      <div className="text-xs text-gray-400 truncate">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${
          isBad ? 'text-red-400' : isGood ? 'text-emerald-400' : 'text-amber-400'
        }`}
      >
        {value.toFixed(0)}
      </div>
    </Card>
  );
}
