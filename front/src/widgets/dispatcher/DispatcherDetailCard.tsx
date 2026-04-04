import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { StatusDot } from '@/components/StatusDot';
import { isKZ8ATelemetry, isTE33ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';
import clsx from 'clsx';

interface Props {
  locoId: string;
}

export function DispatcherDetailCard({ locoId }: Props) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);
  const route = useDashboardStore((s) => s.routes[locoId]);
  const overlay = useDashboardStore((s) => s.dispatcherOverlays[locoId]);

  if (!telemetry) return null;

  const t = telemetry;
  const hi = processed?.health_index ?? 0;
  const healthStatus = processed?.health_status ?? 'Critical';

  // Determine summary action
  let summary = 'Continue';
  let summaryColor = 'text-emerald-400';
  if (hi < 50) {
    summary = 'Send to maintenance';
    summaryColor = 'text-red-400';
  } else if (hi < 80) {
    summary = 'Monitor closely';
    summaryColor = 'text-amber-400';
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{locoId}</h3>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
            {t.locomotive_model}
          </span>
        </div>
        <div className="text-right">
          <div
            className={clsx(
              'text-3xl font-bold tabular-nums',
              hi >= 80 ? 'text-emerald-400' : hi >= 50 ? 'text-amber-400' : 'text-red-400',
            )}
          >
            {hi}
          </div>
          <div className="text-xs text-gray-400">{healthStatus}</div>
        </div>
      </div>

      {/* Route info */}
      {route && (
        <div className="mb-4 rounded-lg bg-gray-800/50 px-3 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">
              {route.from} → {route.to}
            </span>
            <span className="text-gray-400">
              {route.position_km.toFixed(0)} / {route.totalKm} km
            </span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-gray-400">
            <span>
              Deviation:{' '}
              <span
                className={
                  Math.abs(route.schedule_deviation_min) > 3
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              >
                {route.schedule_deviation_min > 0 ? '+' : ''}
                {route.schedule_deviation_min.toFixed(1)} min
              </span>
            </span>
            <span>ETA: {route.eta_to_checkpoint_min.toFixed(0)} min</span>
            <span>Compliance: {route.route_compliance_score}%</span>
          </div>
        </div>
      )}

      {/* Model-specific metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="Speed" value={`${t.speed_kmh.toFixed(0)} km/h`} />
        <div>
          <div className="text-xs text-gray-400">Communication</div>
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
            <span className="text-gray-200">{t.communication_status}</span>
          </div>
        </div>
        {isKZ8ATelemetry(t) && (
          <>
            <div>
              <div className="text-xs text-gray-400">Transformer</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.main_transformer_status} />
                <span className="text-gray-200">{t.main_transformer_status}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Pantograph</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.pantograph_status} />
                <span className="text-gray-200">{t.pantograph_status}</span>
              </div>
            </div>
          </>
        )}
        {isTE33ATelemetry(t) && (
          <>
            <div>
              <div className="text-xs text-gray-400">Engine</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.engine_status} />
                <span className="text-gray-200">{t.engine_status}</span>
              </div>
            </div>
            <Field label="Fuel" value={`${t.fuel_level_pct.toFixed(0)}%`} />
            <div>
              <div className="text-xs text-gray-400">Dynamic Brake</div>
              <div className="mt-0.5 flex items-center gap-1">
                <StatusDot status={t.dynamic_brake_status} />
                <span className="text-gray-200">{t.dynamic_brake_status}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fault */}
      {t.fault_code && (
        <div className="mb-3 rounded bg-red-500/10 px-3 py-1.5 text-sm text-red-400">
          Active fault: {t.fault_code}
        </div>
      )}

      {/* Decision summary */}
      <div className="rounded-lg border border-gray-700 px-3 py-2 text-center">
        <span className={clsx('text-sm font-bold', summaryColor)}>{summary}</span>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-0.5 font-medium text-gray-200">{value}</div>
    </div>
  );
}
