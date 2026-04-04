import { useEffect } from 'react';
import { useDashboardStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';

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

  // On mount: check stored token
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="login-card__spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp user={user} onLogout={logout} />;
}

function AuthenticatedApp({ user, onLogout }: { user: ReturnType<typeof useAuthStore.getState>['user']; onLogout: () => void }) {
  useWebSocket();

  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const Dashboard = dashboards[selectedRole];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="app-header sticky top-0 z-50 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/header-logo.svg" alt="KTZ" className="h-7 w-auto opacity-90" />
              <div>
                <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {roleTitles[selectedRole]}
                </h1>
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Digital Twin
                </span>
              </div>
            </div>
            <LocomotiveSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <ConnectionBadge />
            {user && (
              <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.full_name}</span>
                <button
                  onClick={onLogout}
                  className="rounded-md px-2.5 py-1 text-xs transition-all"
                  style={{ color: 'var(--text-muted)', background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-screen-2xl px-5 py-5">
        <Dashboard />
      </main>
    </div>
  );
}
