import { useRef, useEffect, useState } from 'react';
import { useTelemetry } from '@/hooks/useTelemetry';

interface Props {
  locoId: string | null;
  maxSpeed?: number;
  size?: number;
}

export function SpeedGauge({ locoId, maxSpeed = 160, size: propSize }: Props) {
  const telemetry = useTelemetry(locoId);
  const rawSpeed = telemetry?.speed_kmh ?? 0;

  // Smoothly animate speed to avoid jump on reload
  const [displaySpeed, setDisplaySpeed] = useState(rawSpeed);
  const rafRef = useRef<number>(0);
  const targetRef = useRef(rawSpeed);

  useEffect(() => {
    targetRef.current = rawSpeed;
    let start: number | null = null;
    const from = displaySpeed;
    const to = rawSpeed;
    const duration = 800;

    function step(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t); // ease-out
      setDisplaySpeed(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rawSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const speed = displaySpeed;
  const pct = Math.min(speed / maxSpeed, 1);

  const size = propSize ?? 160;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size * 0.375;
  const strokeW = size * 0.088;
  const startAngle = Math.PI;
  const totalArc = Math.PI;
  const filledArc = totalArc * pct;

  function polarToCart(angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  const bgStart = polarToCart(startAngle);
  const bgEnd = polarToCart(0);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  const fillEnd = polarToCart(startAngle - filledArc);
  const largeArc = filledArc > Math.PI / 2 ? 1 : 0;
  const fillPath = pct > 0.005
    ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`
    : '';

  const color = speed > maxSpeed * 0.85 ? '#ef4444'
    : speed > maxSpeed * 0.6 ? '#e8943a' : '#11b7e7';

  // 5 tick marks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const angle = startAngle - t * totalArc;
    const inner = { x: cx + (r - 18) * Math.cos(angle), y: cy - (r - 18) * Math.sin(angle) };
    const outer = { x: cx + (r + 4) * Math.cos(angle), y: cy - (r + 4) * Math.sin(angle) };
    const labelPos = { x: cx + (r - 30) * Math.cos(angle), y: cy - (r - 30) * Math.sin(angle) };
    return { inner, outer, labelPos, value: Math.round(maxSpeed * t) };
  });

  const fontSize = size * 0.2;
  const unitSize = size * 0.069;
  const tickFontSize = size * 0.056;

  return (
    <div className="kpi-card" style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="kpi-card__label" style={{ alignSelf: 'flex-start' }}>Скорость</div>
      <svg width={size} height={size / 2 + 36} viewBox={`0 0 ${size} ${size / 2 + 36}`} style={{ marginTop: -4, maxWidth: '100%' }}>
        <defs>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="4" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} strokeLinecap="round" />
        {/* Filled arc — no CSS transition, animated via RAF */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
            filter="url(#gauge-glow)" />
        )}
        {/* Ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <text x={t.labelPos.x} y={t.labelPos.y} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.2)" fontSize={tickFontSize} fontWeight="600">{t.value}</text>
          </g>
        ))}
        {/* Center value */}
        <text x={cx} y={cy + 2} textAnchor="middle" fill="#eae6df" fontSize={fontSize} fontWeight="800"
          fontFamily="inherit">{Math.round(speed)}</text>
        <text x={cx} y={cy + fontSize * 0.6} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={unitSize}
          fontWeight="600">км/ч</text>
      </svg>
    </div>
  );
}
