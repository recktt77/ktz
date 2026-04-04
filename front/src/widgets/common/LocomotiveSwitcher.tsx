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
    <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
      {locoIds.map((id) => {
        const t = telemetry[id];
        const p = processed[id];
        if (!t) return null;

        return (
          <button
            key={id}
            onClick={() => selectLocomotive(id)}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              selectedId === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            <span>{id}</span>
            <span className="rounded bg-gray-600 px-1 py-0.5 text-[10px]">
              {t.locomotive_model}
            </span>
            {p && (
              <span
                className={clsx(
                  'tabular-nums font-bold',
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
          </button>
        );
      })}
    </div>
  );
}
