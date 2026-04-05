import { useState, useMemo } from 'react';
import { useTelemetry } from '@/hooks/useTelemetry';
import { METRIC_UNITS } from '@/lib/constants';

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

/** Known reasonable maximums per metric for bar percentage scaling */
const METRIC_MAX: Record<string, number> = {
  tractive_effort_kn: 400,
  catenary_current_a: 600,
  energy_consumption_kw: 3000,
  brake_system_pressure_bar: 10,
  regenerative_braking_power_kw: 800,
  speed_kmh: 160,
  catenary_voltage_kv: 30,
  engine_rpm: 2200,
  engine_load_pct: 100,
  fuel_level_pct: 100,
  fuel_consumption_lph: 500,
};

/**
 * Horizontal bar chart widget showing current metric values with tabs.
 */
export function BarChartWidget({ locoId, tabs }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const telemetry = useTelemetry(locoId);

  const activeMetrics = useMemo(
    () => tabs.find((t) => t.id === activeTab)?.metrics ?? [],
    [tabs, activeTab],
  );

  // Read current values from telemetry
  const bars = useMemo(() => {
    if (!telemetry) return activeMetrics.map((m) => ({ ...m, value: 0, pct: 0, unit: METRIC_UNITS[m.key] ?? '' }));
    return activeMetrics.map((m) => {
      const raw = (telemetry as unknown as Record<string, unknown>)[m.key];
      const value = typeof raw === 'number' ? raw : 0;
      const max = METRIC_MAX[m.key] ?? 1000;
      return { ...m, value, pct: Math.min(value / max, 1), unit: METRIC_UNITS[m.key] ?? '' };
    });
  }, [telemetry, activeMetrics]);

  return (
    <div className="chart-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#eae6df' }}>
          Управление движением
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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
        </div>
      </div>

      {/* Metric bars — vertically centered */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
          {bars.map((bar) => (
          <div key={bar.key}>
            {/* Label row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.78rem', color: '#9a9088', fontWeight: 500 }}>{bar.label}</span>
              <span style={{ fontSize: '0.82rem', color: '#eae6df', fontWeight: 600 }}>
                {bar.value < 10 ? bar.value.toFixed(1) : Math.round(bar.value)} <span style={{ fontSize: '0.7rem', color: '#6b6155', fontWeight: 400 }}>{bar.unit}</span>
              </span>
            </div>
            {/* Bar track */}
            <div style={{
              height: 10, borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Filled portion */}
              <div style={{
                height: '100%',
                width: `${Math.max(bar.pct * 100, 1)}%`,
                borderRadius: 6,
                background: `linear-gradient(90deg, ${bar.color}60, ${bar.color})`,
                transition: 'width 0.7s ease-out',
                position: 'relative',
              }}>
                {/* Shine effect */}
                <div style={{
                  position: 'absolute', top: 1, left: 4, right: 4, height: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
                }} />
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
