import { useEffect } from 'react';
import { useDashboardStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { USE_MOCK } from '@/lib/constants';
import { ConnectionBadge } from '@/widgets/common/ConnectionBadge';
import { RoleSwitcher } from '@/widgets/common/RoleSwitcher';
import { LocomotiveSwitcher } from '@/widgets/common/LocomotiveSwitcher';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { DispatcherDashboard } from '@/pages/DispatcherDashboard';
import { EngineerDashboard } from '@/pages/EngineerDashboard';
import { SupervisorDashboard } from '@/pages/SupervisorDashboard';
import { LoginPage } from '@/pages/LoginPage';
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
  const { isAuthenticated, isLoading, user, logout, checkAuth } = useAuthStore();

  // On mount: check stored token (skip in mock mode)
  useEffect(() => {
    if (USE_MOCK) {
      // In mock mode, skip real auth — mark as authenticated
      useAuthStore.setState({ isAuthenticated: true, isLoading: false });
    } else {
      checkAuth();
    }
  }, [checkAuth]);

  // Show login if not authenticated and not in mock mode
  if (!USE_MOCK && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="login-card__spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!USE_MOCK && !isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp user={user} onLogout={logout} />;
}

function AuthenticatedApp({ user, onLogout }: { user: ReturnType<typeof useAuthStore.getState>['user']; onLogout: () => void }) {
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
            {user && (
              <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
                <span className="text-xs text-gray-400">{user.full_name}</span>
                <button
                  onClick={onLogout}
                  className="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white"
                >
                  Выйти
                </button>
              </div>
            )}
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
