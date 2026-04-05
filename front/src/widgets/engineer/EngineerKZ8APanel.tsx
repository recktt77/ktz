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
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
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
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
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
