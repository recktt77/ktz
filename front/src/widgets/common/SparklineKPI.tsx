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
 * Reference-style KPI card: big value + mini sparkline.
 */
export function SparklineKPI({ locoId, label, metricKey, value, unit = '', color = '#11b7e7', accent }: Props) {
  const history = useChartHistory(locoId, metricKey);
  const points = history.slice(-30);
  const svgW = 100;
  const svgH = 36;

  let pathD = '';
  let areaD = '';
  if (points.length > 1) {
    const vals = points.map((p) => p.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const coords = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * svgW;
      const y = svgH - ((v - minV) / range) * (svgH - 6) - 3;
      return `${x},${y}`;
    });
    pathD = `M ${coords.join(' L ')}`;
    areaD = `${pathD} L ${svgW},${svgH} L 0,${svgH} Z`;
  }

  return (
    <div className={`kpi-card ${accent ?? ''}`}>
      <div className="kpi-card__label">{label}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#eae6df', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? Math.round(value) : value}
          {unit && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b6155', marginLeft: 4 }}>{unit}</span>}
        </div>
      </div>
      {/* Sparkline at bottom */}
      <svg width={svgW} height={svgH} style={{ width: '100%', marginTop: 'auto', opacity: 0.7 }}>
        {areaD && <path d={areaD} fill={`${color}12`} />}
        {pathD && (
          <path d={pathD} fill="none" stroke={color} strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}50)` }} />
        )}
      </svg>
    </div>
  );
}
