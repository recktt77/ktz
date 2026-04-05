interface DiagnosticRow {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  unit?: string;
}

interface Props {
  title: string;
  rows: DiagnosticRow[];
}

/**
 * Reference-style horizontal diagnostic bars.
 * "Состояние ТЭ33А" / "Состояние КЗ8А" look.
 */
export function DiagnosticBars({ title, rows }: Props) {
  return (
    <div className="panel p-2">
      <div className="kpi-card__label mb-2">{title}</div>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const pct = Math.max(0, Math.min(100, (row.value / row.maxValue) * 100));
          const isHigh = pct > 85;
          const barColor = isHigh ? '#ef4444' : row.color;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ color: isHigh ? '#ef4444' : 'var(--text-primary)' }}>
                  {row.value.toFixed(1)}{row.unit ? ` ${row.unit}` : ''}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(245,185,70,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
                    boxShadow: `0 0 10px ${barColor}30`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
