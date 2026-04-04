import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { StatusDot } from '@/components/StatusDot';
import { isKZ8ATelemetry, isTE33ATelemetry } from '@/types';
import clsx from 'clsx';

interface Props {
  locoId: string;
}

export function DispatcherDetailCard({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);
  const route = useDashboardStore((s) => s.routes[locoId]);

  if (!telemetry) return null;

  const t = telemetry;
  const hi = processed?.health_index ?? 0;
  const healthStatus = processed?.health_status ?? 'Critical';

  let summary = 'Continue';
  let summaryColor = 'var(--status-normal)';
  if (hi < 50) {
    summary = 'Send to maintenance';
    summaryColor = 'var(--status-critical)';
  } else if (hi < 80) {
    summary = 'Monitor closely';
    summaryColor = 'var(--status-warning)';
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{locoId}</h3>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            {t.locomotive_model}
          </span>
        </div>
        <div className="text-right">
          <div
            className="text-3xl font-bold tabular-nums"
            style={{
              color: hi >= 80 ? 'var(--status-normal)' : hi >= 50 ? 'var(--status-warning)' : 'var(--status-critical)',
            }}
          >
            {hi}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{healthStatus}</div>
        </div>
      </div>

      {route && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ background: 'var(--bg-inset)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>{route.from} → {route.to}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {route.position_km.toFixed(0)} / {route.totalKm} km
            </span>
          </div>
          <div className="mt-1 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>
              Deviation:{' '}
              <span style={{
                color: Math.abs(route.schedule_deviation_min) > 3
                  ? 'var(--status-warning)'
                  : 'var(--status-normal)',
              }}>
                {route.schedule_deviation_min > 0 ? '+' : ''}
                {route.schedule_deviation_min.toFixed(1)} min
              </span>
            </span>
            <span>ETA: {route.eta_to_checkpoint_min.toFixed(0)} min</span>
            <span>Compliance: {route.route_compliance_score}%</span>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="Speed" value={`${t.speed_kmh.toFixed(0)} km/h`} />
        <div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Communication</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot
              status={
                t.communication_status === 'online'
                  ? 'ok'
                  : t.communication_status === 'degraded'
                    ? 'degraded'
                    : 'fault'
              }
            />
            <span style={{ color: 'var(--text-secondary)' }}>{t.communication_status}</span>
          </div>
        </div>
        {isKZ8ATelemetry(t) && (
          <>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Transformer</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.main_transformer_status} />
                <span style={{ color: 'var(--text-secondary)' }}>{t.main_transformer_status}</span>
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Pantograph</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.pantograph_status} />
                <span style={{ color: 'var(--text-secondary)' }}>{t.pantograph_status}</span>
              </div>
            </div>
          </>
        )}
        {isTE33ATelemetry(t) && (
          <>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Engine</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.engine_status} />
                <span style={{ color: 'var(--text-secondary)' }}>{t.engine_status}</span>
              </div>
            </div>
            <Field label="Fuel" value={`${t.fuel_level_pct.toFixed(0)}%`} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Dynamic Brake</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.dynamic_brake_status} />
                <span style={{ color: 'var(--text-secondary)' }}>{t.dynamic_brake_status}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {t.fault_code && (
        <div className="mb-3 rounded px-3 py-1.5 text-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--status-critical)' }}>
          Active fault: {t.fault_code}
        </div>
      )}

      <div className="rounded-lg px-3 py-2 text-center" style={{ border: '1px solid var(--border-default)' }}>
        <span className="text-sm font-bold" style={{ color: summaryColor }}>{summary}</span>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="mt-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  );
}
