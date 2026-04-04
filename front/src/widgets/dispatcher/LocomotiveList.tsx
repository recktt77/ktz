import { useDashboardStore } from '@/store';
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
      <div className="panel p-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Waiting for locomotive data…
      </div>
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
          <div
            key={id}
            className={clsx(
              'panel p-3 cursor-pointer transition-all',
              selectedId === id && 'panel--glow-cyan',
            )}
            onClick={() => selectLocomotive(id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{id}</span>
                <span
                  className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
                >
                  {t.locomotive_model}
                </span>
              </div>
              {p && (
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{
                    color:
                      p.health_index >= 80
                        ? 'var(--status-normal)'
                        : p.health_index >= 50
                          ? 'var(--status-warning)'
                          : 'var(--status-critical)',
                  }}
                >
                  {p.health_index}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
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
              <div className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                {r.from} → {r.to} · {r.position_km.toFixed(0)}/{r.totalKm} km ·{' '}
                <span
                  style={{
                    color: r.schedule_deviation_min > 3
                      ? 'var(--status-warning)'
                      : 'var(--status-normal)',
                  }}
                >
                  {r.schedule_deviation_min > 0 ? '+' : ''}
                  {r.schedule_deviation_min.toFixed(1)} min
                </span>
              </div>
            )}

            {t.fault_code && (
              <div className="mt-1 text-xs font-medium" style={{ color: 'var(--status-critical)' }}>
                Fault: {t.fault_code}
              </div>
            )}
          </div>
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
