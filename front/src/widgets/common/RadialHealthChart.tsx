interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  centerValue: number;
  centerLabel?: string;
  size?: number;
}

/**
 * Radial / donut chart like the reference (59% Среднее).
 * Shows multiple colored arcs around a center value.
 */
export function RadialHealthChart({ segments, centerValue, centerLabel = 'Среднее', size = 180 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 8;
  const gap = 12;
  const outerR = (size - strokeW) / 2 - 4;

  // Each segment gets its own ring
  const rings = segments.map((seg, i) => {
    const r = outerR - i * gap;
    if (r <= 10) return null;
    const circumference = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, seg.value / 100));
    const offset = circumference - pct * circumference;
    return { ...seg, r, circumference, offset };
  }).filter(Boolean) as (Segment & { r: number; circumference: number; offset: number })[];

  return (
    <div className="kpi-card flex flex-col items-center" style={{ padding: '6px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {rings.map((ring, i) => (
          <g key={i}>
            <circle
              cx={cx} cy={cy} r={ring.r}
              fill="none"
              stroke="rgba(245,185,70,0.04)"
              strokeWidth={strokeW}
            />
            <circle
              cx={cx} cy={cy} r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={ring.circumference}
              strokeDashoffset={ring.offset}
              style={{
                transition: 'stroke-dashoffset 1s ease-out',
                filter: `drop-shadow(0 0 6px ${ring.color}50)`,
              }}
            />
          </g>
        ))}
        <g style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>
          <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--accent-amber)" fontSize="22" fontWeight="800">
            {centerValue}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="600">
            {centerLabel}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-2 space-y-1.5 w-full">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
