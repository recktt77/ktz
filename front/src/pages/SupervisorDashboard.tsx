import { FleetSummaryBar } from '@/widgets/supervisor/FleetSummaryBar';
import { FleetTable } from '@/widgets/supervisor/FleetTable';
import { LocomotiveDecisionCard } from '@/widgets/supervisor/LocomotiveDecisionCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';

export function SupervisorDashboard() {
  return (
    <div className="space-y-4">
      <FleetSummaryBar />
      <FleetTable />
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
