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
 * Reference-style bar chart with tabs.
 * Shows last N time-buckets as rounded colorful bars.
 */
export function BarChartWidget({ locoId, tabs, height = 240 }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const activeMetrics = useMemo(
    () => tabs.find((t) => t.id === activeTab)?.metrics ?? [],
    [tabs, activeTab],
  );

  return (
    <div className="chart-card">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-2">
        <div className="chart-card__header mb-0">Управление движением</div>
        <div className="flex items-center gap-0.5" style={{ background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={activeTab === tab.id
                ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                : { background: 'transparent', color: 'var(--text-muted)' }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div style={{ height }}>
        <BarGroup locoId={locoId} metrics={activeMetrics} height={height} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        {activeMetrics.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: m.color }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarGroup({ locoId, metrics, height }: { locoId: string | null; metrics: MetricDef[]; height: number }) {
  // Collect last 7 data points per metric for bar chart
  const metricHistories = metrics.map((m) => ({
    ...m,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    history: useChartHistory(locoId, m.key),
  }));

  const BUCKET_COUNT = 7;
  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Compute buckets: take last BUCKET_COUNT points from history, normalize to 0-1
  const buckets = useMemo(() => {
    const result: { label: string; values: { color: string; value: number; raw: number }[] }[] = [];

    // Find global max across all metrics for scaling
    let globalMax = 1;
    for (const mh of metricHistories) {
      const points = mh.history.slice(-BUCKET_COUNT);
      for (const p of points) {
        if (p.value > globalMax) globalMax = p.value;
      }
    }

    for (let i = 0; i < BUCKET_COUNT; i++) {
      const values = metricHistories.map((mh) => {
        const points = mh.history.slice(-BUCKET_COUNT);
        const raw = points[i]?.value ?? 0;
        return {
          color: mh.color,
          value: raw / globalMax,
          raw,
        };
      });
      result.push({ label: DAYS[i] ?? `${i + 1}`, values });
    }

    return result;
  }, [metricHistories]);

  const barMaxH = height - 30;
  const barWidth = 14;

  return (
    <div className="flex items-end justify-around h-full px-2">
      {buckets.map((bucket, bi) => (
        <div key={bi} className="flex flex-col items-center gap-1.5">
          <div className="flex items-end gap-1.5" style={{ height: barMaxH }}>
            {bucket.values.map((v, vi) => (
              <div
                key={vi}
                className="transition-all duration-700 ease-out"
                style={{
                  width: barWidth,
                  borderRadius: '6px 6px 4px 4px',
                  height: `${Math.max(v.value * 100, 4)}%`,
                  background: `linear-gradient(to top, ${v.color}80, ${v.color})`,
                  boxShadow: `0 0 8px ${v.color}30`,
                }}
                title={`${v.raw.toFixed(1)}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            {bucket.label}
          </span>
        </div>
      ))}
    </div>
  );
}
