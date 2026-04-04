import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { MetricCard } from '@/widgets/common/MetricCard';
import { TelemetryChart } from '@/widgets/common/TelemetryChart';
import { Card } from '@/components/Card';
import { isKZ8ATelemetry, isKZ8AProcessed } from '@/types';
import type { KZ8AProcessed } from '@/types';

interface Props {
  locoId: string;
}

export function EngineerKZ8APanel({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);

  if (!telemetry || !isKZ8ATelemetry(telemetry)) return null;
  const p = processed && isKZ8AProcessed(processed) ? (processed as KZ8AProcessed) : null;

  return (
    <div className="space-y-4">
      {/* Component health scores */}
      {p && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <ScoreCard label="Electrical Supply Risk" value={p.electrical_supply_risk} invert />
          <ScoreCard label="Transformer Health" value={p.transformer_health_score} />
          <ScoreCard label="Transformer Thermal Risk" value={p.transformer_thermal_risk} invert />
          <ScoreCard label="Traction Drive Health" value={p.traction_drive_health_score} />
          <ScoreCard label="Converter Thermal Risk" value={p.converter_thermal_risk} invert />
          <ScoreCard label="Regen Efficiency" value={p.regen_efficiency_score} />
          <ScoreCard label="Brake Risk" value={p.brake_risk} invert />
          <ScoreCard label="Energy Efficiency" value={p.energy_efficiency_score} />
          <ScoreCard label="Maintenance Priority" value={p.maintenance_priority_score} invert />
        </div>
      )}

      {/* Diagnostic charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TelemetryChart locoId={locoId} metricKey="catenary_voltage_kv" color="#3b82f6" />
        <TelemetryChart locoId={locoId} metricKey="catenary_current_a" color="#8b5cf6" />
        <TelemetryChart locoId={locoId} metricKey="main_transformer_temp_c" color="#f59e0b" />
        <TelemetryChart locoId={locoId} metricKey="traction_converter_temp_c" color="#ef4444" />
        <TelemetryChart locoId={locoId} metricKey="tractive_effort_kn" color="#22d3ee" />
        <TelemetryChart locoId={locoId} metricKey="regenerative_braking_power_kw" color="#34d399" />
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
