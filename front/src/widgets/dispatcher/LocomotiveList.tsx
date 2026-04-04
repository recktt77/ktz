import { useDashboardStore } from '@/store';
import { Card } from '@/components/Card';
import { StatusDot } from '@/components/StatusDot';
import clsx from 'clsx';
import type { LocomotiveTelemetry } from '@/types';
import { isKZ8ATelemetry, isTE33ATelemetry } from '@/types';

export function LocomotiveList() {
  const telemetry = useDashboardStore((s) => s.telemetry);
  const processed = useDashboardStore((s) => s.processed);
  const routes = useDashboardStore((s) => s.routes);
  const selectedId = useDashboardStore((s) => s.selectedLocomotiveId);
  const selectLocomotive = useDashboardStore((s) => s.selectLocomotive);

  const locoIds = Object.keys(telemetry);

  if (locoIds.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center text-sm text-gray-600">
          Waiting for locomotive data…
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {locoIds.map((id) => {
        const t = telemetry[id];
        const p = processed[id];
        const r = routes[id];
        if (!t) return null;

        return (
          <Card
            key={id}
            className={clsx(
              'cursor-pointer transition-colors hover:bg-gray-800/70',
              selectedId === id && 'ring-1 ring-cyan-500/50 bg-gray-800/60',
            )}
          >
            <div onClick={() => selectLocomotive(id)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{id}</span>
                  <span className="ml-2 rounded bg-gray-800 px-1.5 py-0.5 text-xs font-medium">
                    {t.locomotive_model}
                  </span>
                </div>
                {p && (
                  <span
                    className={clsx(
                      'text-lg font-bold tabular-nums',
                      p.health_index >= 80
                        ? 'text-emerald-400'
                        : p.health_index >= 50
                          ? 'text-amber-400'
                          : 'text-red-400',
                    )}
                  >
                    {p.health_index}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{t.speed_kmh.toFixed(0)} km/h</span>
                <ModelInfo t={t} />
                <div className="flex items-center gap-1">
                  <StatusDot
                    status={
                      t.communication_status === 'online'
                        ? 'ok'
                        : t.communication_status === 'degraded'
                          ? 'degraded'
                          : 'fault'
                    }
                  />
                  <span>Comm</span>
                </div>
              </div>

              {r && (
                <div className="mt-1 text-xs text-gray-500">
                  {r.from} → {r.to} · {r.position_km.toFixed(0)}/{r.totalKm} km ·{' '}
                  <span
                    className={
                      r.schedule_deviation_min > 3
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {r.schedule_deviation_min > 0 ? '+' : ''}
                    {r.schedule_deviation_min.toFixed(1)} min
                  </span>
                </div>
              )}

              {t.fault_code && (
                <div className="mt-1 text-xs font-medium text-red-400">
                  Fault: {t.fault_code}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ModelInfo({ t }: { t: LocomotiveTelemetry }) {
  if (isKZ8ATelemetry(t)) {
    return (
      <>
        <span>{t.catenary_voltage_kv.toFixed(1)} kV</span>
        <div className="flex items-center gap-1">
          <StatusDot status={t.pantograph_status} />
          <span>Pant</span>
        </div>
      </>
    );
  }
  if (isTE33ATelemetry(t)) {
    return (
      <>
        <span>{t.fuel_level_pct.toFixed(0)}% fuel</span>
        <div className="flex items-center gap-1">
          <StatusDot status={t.engine_status} />
          <span>Eng</span>
        </div>
      </>
    );
  }
  return null;
}
