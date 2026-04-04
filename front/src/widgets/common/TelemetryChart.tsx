import { useEffect, useRef, useMemo } from 'react';
import { useChartHistory } from '@/hooks/useTelemetry';
import { Card } from '@/components/Card';
import { METRIC_LABELS, METRIC_UNITS } from '@/lib/constants';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  type Time,
  LineSeries,
} from 'lightweight-charts';

interface Props {
  locoId: string | null;
  metricKey: string;
  color?: string;
  height?: number;
}

export function TelemetryChart({
  locoId,
  metricKey,
  color = '#22d3ee',
  height = 180,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const history = useChartHistory(locoId, metricKey);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(255,255,255,0.1)',
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seriesRef.current = series as any;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [color, height]);

  const data = useMemo(
    () =>
      history.map((p) => ({
        time: (p.timestamp / 1000) as Time,
        value: p.value,
      })),
    [history],
  );

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  const label = METRIC_LABELS[metricKey] || metricKey.replace(/_/g, ' ');
  const unit = METRIC_UNITS[metricKey] || '';

  return (
    <Card>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
        {unit && ` (${unit})`}
      </div>
      <div ref={containerRef} />
    </Card>
  );
}
