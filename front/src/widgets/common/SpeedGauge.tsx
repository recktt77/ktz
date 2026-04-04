import { useTelemetry } from '@/hooks/useTelemetry';

interface Props {
  locoId: string | null;
  maxSpeed?: number;
}

export function SpeedGauge({ locoId, maxSpeed = 160 }: Props) {
  const telemetry = useTelemetry(locoId);
  const speed = telemetry?.speed_kmh ?? 0;
  const pct = Math.min(speed / maxSpeed, 1);

  // Arc parameters (semi-circle gauge)
  const size = 180;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 70;
  const strokeW = 12;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI;
  const filledArc = totalArc * pct;

  function polarToCart(angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  }

  // Background arc (full semi-circle, left to right)
  const bgStart = polarToCart(startAngle);
  const bgEnd = polarToCart(endAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Filled arc
  const fillEnd = polarToCart(startAngle - filledArc);
  const largeArc = filledArc > Math.PI / 2 ? 1 : 0;
  const fillPath = filledArc > 0.001
    ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`
    : '';

  // Gradient color based on speed
  const color = speed > maxSpeed * 0.85
    ? 'var(--status-critical)'
    : speed > maxSpeed * 0.6
      ? 'var(--accent-amber)'
      : 'var(--accent-cyan)';

  // Tick marks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const angle = startAngle - t * totalArc;
    const inner = { x: cx + (r - 18) * Math.cos(angle), y: cy - (r - 18) * Math.sin(angle) };
    const outer = { x: cx + (r + 4) * Math.cos(angle), y: cy - (r + 4) * Math.sin(angle) };
    const labelPos = { x: cx + (r - 30) * Math.cos(angle), y: cy - (r - 30) * Math.sin(angle) };
    return { inner, outer, labelPos, value: Math.round(maxSpeed * t) };
  });

  return (
    <div className="kpi-card kpi-card--cyan flex flex-col items-center">
      <div className="kpi-card__label">Скорость</div>
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
              transition: 'all 0.8s ease-out',
            }}
          />
        )}
        {/* Ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.inner.x} y1={t.inner.y}
              x2={t.outer.x} y2={t.outer.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
            />
            <text
              x={t.labelPos.x} y={t.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="9"
              fontWeight="600"
            >
              {t.value}
            </text>
          </g>
        ))}
        {/* Center value */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize="32" fontWeight="800" fontFamily="inherit">
          {Math.round(speed)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontWeight="600">
          км/ч
        </text>
      </svg>
    </div>
  );
}
