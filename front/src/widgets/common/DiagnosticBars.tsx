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
    <div className="panel p-5">
      <div className="kpi-card__label mb-4">{title}</div>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const pct = Math.max(0, Math.min(100, (row.value / row.maxValue) * 100));
          const isHigh = pct > 80;
          const barColor = isHigh ? 'var(--status-critical)' : row.color;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ color: isHigh ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {row.value.toFixed(1)}{row.unit ? ` ${row.unit}` : ''}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
                    boxShadow: `0 0 8px ${barColor}40`,
                  }}
                />
                {/* Threshold marker */}
                <div
                  className="absolute top-0 h-full w-0.5"
                  style={{ left: '80%', background: 'rgba(255,255,255,0.15)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
