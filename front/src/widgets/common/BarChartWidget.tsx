import { useState, useMemo } from 'react';
import { useChartHistory } from '@/hooks/useTelemetry';

interface MetricDef {
  key: string;
  label: string;
  color: string;
}

interface Tab {
  id: string;
  label: string;
  metrics: MetricDef[];
}

interface Props {
  locoId: string | null;
  tabs: Tab[];
  height?: number;
}

/**
 * Reference-style bar chart with underline tabs and test-tube pill bars.
 */
export function BarChartWidget({ locoId, tabs }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const [period] = useState('Weekly');
  const activeMetrics = useMemo(
    () => tabs.find((t) => t.id === activeTab)?.metrics ?? [],
    [tabs, activeTab],
  );

  return (
    <div className="chart-card" style={{ overflow: 'hidden' }}>
      {/* Header: title left, tabs center-right, period dropdown right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#eae6df' }}>
          Управление движением
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 0', fontSize: '0.8rem', fontWeight: 500,
                color: activeTab === tab.id ? '#eae6df' : '#6b6155',
                borderBottom: activeTab === tab.id ? '2px solid #eae6df' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
          <span style={{
            fontSize: '0.78rem', color: '#6b6155', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {period} <span style={{ fontSize: '0.6rem' }}>▼</span>
          </span>
        </div>
      </div>

      {/* Y-axis + Bars area */}
      <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0, overflow: 'hidden' }}>
        {/* Y-axis labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24, width: 36 }}>
          {['30k', '20k', '10k', '05k', '00k'].map((label) => (
            <span key={label} style={{ fontSize: '0.68rem', color: '#4a4238', textAlign: 'right' }}>{label}</span>
          ))}
        </div>
        {/* Bars */}
        <div style={{ flex: 1 }}>
          <BarGroup locoId={locoId} metrics={activeMetrics} />
        </div>
      </div>
    </div>
  );
}

function BarGroup({ locoId, metrics }: { locoId: string | null; metrics: MetricDef[] }) {
  const metricHistories = metrics.map((m) => ({
    ...m,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    history: useChartHistory(locoId, m.key),
  }));

  const BUCKET_COUNT = 7;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const buckets = useMemo(() => {
    const result: { label: string; values: { color: string; value: number; raw: number }[] }[] = [];
    let globalMax = 1;
    for (const mh of metricHistories) {
      const points = mh.history.slice(-BUCKET_COUNT);
      for (const p of points) if (p.value > globalMax) globalMax = p.value;
    }
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const values = metricHistories.map((mh) => {
        const points = mh.history.slice(-BUCKET_COUNT);
        const raw = points[i]?.value ?? 0;
        return { color: mh.color, value: raw / globalMax, raw };
      });
      result.push({ label: DAYS[i] ?? `${i + 1}`, values });
    }
    return result;
  }, [metricHistories]);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100%', paddingBottom: 0 }}>
      {buckets.map((bucket, bi) => (
        <div key={bi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flex: 1, width: '100%', justifyContent: 'center' }}>
            {bucket.values.map((v, vi) => {
              const h = Math.max(v.value * 100, 6);
              return (
                <div key={vi} title={`${v.raw.toFixed(1)}`} style={{
                  width: 18,
                  height: `${h}%`,
                  borderRadius: 10,
                  background: `linear-gradient(to top, ${v.color}40, ${v.color}bb ${60}%, ${v.color} 100%)`,
                  transition: 'height 0.7s ease-out',
                  position: 'relative',
                  boxShadow: `inset 0 -20px 20px ${v.color}15`,
                }}>
                  {/* Top highlight (test-tube cap) */}
                  <div style={{
                    position: 'absolute', top: 3, left: 3, right: 3, height: 6,
                    borderRadius: 6,
                    background: `linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)`,
                  }} />
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#4a4238' }}>
            {bucket.label}
          </span>
        </div>
      ))}
    </div>
  );
}
