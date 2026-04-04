import { useDashboardStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ConnectionBadge } from '@/widgets/common/ConnectionBadge';
import { RoleSwitcher } from '@/widgets/common/RoleSwitcher';
import { LocomotiveSwitcher } from '@/widgets/common/LocomotiveSwitcher';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { DispatcherDashboard } from '@/pages/DispatcherDashboard';
import { EngineerDashboard } from '@/pages/EngineerDashboard';
import { SupervisorDashboard } from '@/pages/SupervisorDashboard';
import type { UserRole } from '@/types';

const dashboards: Record<UserRole, React.FC> = {
  driver: DriverDashboard,
  dispatcher: DispatcherDashboard,
  engineer: EngineerDashboard,
  supervisor: SupervisorDashboard,
};

const roleTitles: Record<UserRole, string> = {
  driver: 'Driver Dashboard',
  dispatcher: 'Fleet Dispatch',
  engineer: 'Diagnostic Engineer',
  supervisor: 'Fleet Operations',
};

export default function App() {
  useWebSocket();

  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const Dashboard = dashboards[selectedRole];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/header-logo.svg" alt="KTZ" className="h-7 w-auto" />
              <h1 className="text-base font-bold tracking-tight">
                {roleTitles[selectedRole]}
              </h1>
            </div>
            <LocomotiveSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <ConnectionBadge />
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-screen-2xl px-4 py-4">
        <Dashboard />
      </main>
    </div>
  );
}
