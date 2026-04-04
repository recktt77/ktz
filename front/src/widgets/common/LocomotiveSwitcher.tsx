import { useDashboardStore } from '@/store';
import clsx from 'clsx';

export function LocomotiveSwitcher() {
  const telemetry = useDashboardStore((s) => s.telemetry);
  const selectedId = useDashboardStore((s) => s.selectedLocomotiveId);
  const selectLocomotive = useDashboardStore((s) => s.selectLocomotive);
  const processed = useDashboardStore((s) => s.processed);

  const locoIds = Object.keys(telemetry);

  if (locoIds.length <= 1) return null;

  return (
    <div className="switcher-pill">
      {locoIds.map((id) => {
        const t = telemetry[id];
        const p = processed[id];
        if (!t) return null;

        return (
          <button
            key={id}
            onClick={() => selectLocomotive(id)}
            className={clsx(
              'switcher-pill__btn flex items-center gap-2',
              selectedId === id && 'switcher-pill__btn--active',
            )}
          >
            <span>{id}</span>
            <span
              className="rounded px-1 py-0.5"
              style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
            >
              {t.locomotive_model}
            </span>
            {p && (
              <span
                className="font-bold tabular-nums"
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
          </button>
        );
      })}
    </div>
  );
}
