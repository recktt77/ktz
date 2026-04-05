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
 * Reference-style thick rounded diagnostic bars with vertical marker line and hover tooltip.
 */
export function DiagnosticBars({ title, rows }: Props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.04)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      padding: '18px 20px',
      height: '100%',
    }}>
      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#eae6df', marginBottom: 16 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, i) => {
          const pct = Math.max(0, Math.min(100, (row.value / row.maxValue) * 100));
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Label */}
              <div style={{
                width: 140, flexShrink: 0,
                fontSize: '0.78rem', fontWeight: 500, color: '#a09888',
              }}>
                {row.label}
              </div>
              {/* Bar track — with tooltip */}
              <div
                style={{
                  flex: 1, height: 14, borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  position: 'relative', overflow: 'hidden',
                  cursor: 'default',
                }}
                title={`${row.label}: ${row.value.toFixed(1)} ${row.unit ?? ''} (${pct.toFixed(0)}%)`}
              >
                {/* Filled */}
                <div style={{
                  height: '100%', borderRadius: 8,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${row.color}90, ${row.color})`,
                  transition: 'width 0.7s ease-out',
                  position: 'relative',
                }}>
                  {/* Vertical marker line at end */}
                  <div style={{
                    position: 'absolute', right: 0, top: -1, bottom: -1,
                    width: 3, borderRadius: 2,
                    background: '#eae6df',
                    boxShadow: '0 0 6px rgba(255,255,255,0.3)',
                  }} />
                </div>
              </div>
              {/* Value label on the right */}
              <div style={{
                width: 70, flexShrink: 0, textAlign: 'right',
                fontSize: '0.78rem', fontWeight: 600, color: '#eae6df',
              }}>
                {row.value.toFixed(1)} {row.unit ?? ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
