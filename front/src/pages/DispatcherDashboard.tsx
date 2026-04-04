import { useDashboardStore } from '@/store';
import { LocomotiveList } from '@/widgets/dispatcher/LocomotiveList';
import { DispatcherDetailCard } from '@/widgets/dispatcher/DispatcherDetailCard';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { RouteContextWidget } from '@/widgets/common/RouteContextWidget';

export function DispatcherDashboard() {
  const selectedId = useDashboardStore((s) => s.selectedLocomotiveId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Left: locomotive list */}
        <div className="col-span-12 lg:col-span-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Fleet
          </div>
          <LocomotiveList />
        </div>

        {/* Right: selected detail + route */}
        <div className="col-span-12 space-y-4 lg:col-span-8">
          {selectedId ? (
            <>
              <DispatcherDetailCard locoId={selectedId} />
              <RouteContextWidget locoId={selectedId} />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-700 text-sm text-gray-600">
              Select a locomotive from the list
            </div>
          )}
        </div>
      </div>

      {/* All alerts */}
      <AlertsPanel />
    </div>
  );
}
