import { useDashboardStore } from '@/store';
import { FleetSummaryBar } from '@/widgets/supervisor/FleetSummaryBar';
import { FleetTable } from '@/widgets/supervisor/FleetTable';
import { LocomotiveDecisionCard } from '@/widgets/supervisor/LocomotiveDecisionCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { RadialHealthChart } from '@/widgets/common/RadialHealthChart';
import { DiagnosticBars } from '@/widgets/common/DiagnosticBars';
import { RailwayMap } from '@/widgets/map';

export function SupervisorDashboard() {
  const fleet = useDashboardStore((s) => s.fleet);

  // Compute fleet-level analytics for radial chart
  const total = fleet.length || 1;
  const good = fleet.filter((e) => e.health_index >= 80).length;
  const warning = fleet.filter((e) => e.health_index >= 50 && e.health_index < 80).length;
  const critical = fleet.filter((e) => e.health_index < 50).length;
  const avgHealth = fleet.length > 0 ? Math.round(fleet.reduce((s, e) => s + e.health_index, 0) / total) : 0;

  const radialSegments = [
    { label: 'Исправные', value: Math.round((good / total) * 100), color: 'var(--status-normal)' },
    { label: 'Внимание', value: Math.round((warning / total) * 100), color: 'var(--status-warning)' },
    { label: 'Критические', value: Math.round((critical / total) * 100), color: 'var(--status-critical)' },
    { label: 'Доступность', value: fleet.length > 0 ? Math.round(fleet.reduce((s, e) => s + e.availability_score, 0) / total) : 0, color: 'var(--accent-cyan)' },
  ];

  // Fleet-level diagnostic bars
  const diagRows = [
    { label: 'Средний health index', value: avgHealth, maxValue: 100, color: avgHealth >= 80 ? 'var(--status-normal)' : avgHealth >= 50 ? 'var(--status-warning)' : 'var(--status-critical)', unit: '%' },
    { label: 'Средний риск простоя', value: fleet.length > 0 ? fleet.reduce((s, e) => s + e.downtime_risk_score, 0) / total : 0, maxValue: 100, color: 'var(--accent-coral)', unit: '%' },
    { label: 'Средняя доступность', value: fleet.length > 0 ? fleet.reduce((s, e) => s + e.availability_score, 0) / total : 0, maxValue: 100, color: 'var(--accent-cyan)', unit: '%' },
    { label: 'Обслуживание (приоритет)', value: fleet.length > 0 ? fleet.reduce((s, e) => s + e.maintenance_priority_score, 0) / total : 0, maxValue: 100, color: 'var(--accent-amber)', unit: '' },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      {/* Row 1: Summary bar */}
      <FleetSummaryBar />

      {/* Row 2: Map + Radial + Diagnostic Bars */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <RailwayMap className="w-full" compact />
        </div>
        <div className="col-span-6 lg:col-span-3">
          <RadialHealthChart
            segments={radialSegments}
            centerValue={avgHealth}
            centerLabel="Fleet Health"
            size={170}
          />
        </div>
        <div className="col-span-6 lg:col-span-3">
          <DiagnosticBars title="Аналитика флота" rows={diagRows} />
        </div>
      </div>

      {/* Row 3: Fleet table */}
      <FleetTable />

      {/* Row 4: Decision card + Alerts */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <LocomotiveDecisionCard />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <AlertsPanel />
        </div>
      </div>
    </div>
  );
}
