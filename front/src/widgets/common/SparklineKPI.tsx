import { useChartHistory } from '@/hooks/useTelemetry';

interface Props {
  locoId: string | null;
  label: string;
  metricKey: string;
  value: number | string;
  unit?: string;
  color?: string;
  accent?: string;
}

/**
 * Reference-style KPI card with embedded mini sparkline.
 * Like "Средний health 69%" with a glowing sparkline behind.
 */
export function SparklineKPI({ locoId, label, metricKey, value, unit = '', color = '#22d3ee', accent }: Props) {
  const history = useChartHistory(locoId, metricKey);

  // Take last 30 points for a mini sparkline
  const points = history.slice(-30);
  const svgW = 80;
  const svgH = 28;

  let pathD = '';
  let areaD = '';
  if (points.length > 1) {
    const vals = points.map((p) => p.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;

    const coords = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * svgW;
      const y = svgH - ((v - minV) / range) * (svgH - 4) - 2;
      return `${x},${y}`;
    });

    pathD = `M ${coords.join(' L ')}`;
    areaD = `${pathD} L ${svgW},${svgH} L 0,${svgH} Z`;
  }

  return (
    <div className={`kpi-card ${accent ?? 'kpi-card--cyan'}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="kpi-card__value" style={{ fontSize: '1.2rem' }}>
          {typeof value === 'number' ? Math.round(value) : value}
          {unit && <span className="kpi-card__unit">{unit}</span>}
        </div>
        {/* Mini sparkline */}
        <svg width={svgW} height={svgH} className="flex-shrink-0 opacity-70">
          {areaD && (
            <path d={areaD} fill={`${color}15`} />
          )}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 3px ${color}60)` }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
