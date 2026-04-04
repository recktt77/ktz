import { useEffect, useState, useMemo } from 'react';
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
import { AdminDashboard } from '@/pages/AdminDashboard';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import type { UserRole } from '@/types';

const dashboards: Record<Exclude<UserRole, 'admin'>, React.FC> = {
  driver: DriverDashboard,
  dispatcher: DispatcherDashboard,
  engineer: EngineerDashboard,
  supervisor: SupervisorDashboard,
};

const roleTitles: Record<Exclude<UserRole, 'admin'>, string> = {
  driver: 'Панель машиниста',
  dispatcher: 'Диспетчерская',
  engineer: 'Инженер-диагност',
  supervisor: 'Руководитель смены',
};

function getInviteCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

export default function App() {
  const { isAuthenticated, isLoading, user, logout, checkAuth } = useAuthStore();
  const [showRegister, setShowRegister] = useState(false);
  const inviteCode = useMemo(() => getInviteCodeFromUrl(), []);

  // On mount: check stored token
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // If URL has ?code=xxx, force show register (log out current user if any)
  useEffect(() => {
    if (inviteCode) {
      if (isAuthenticated) {
        logout();
      }
      setShowRegister(true);
    }
  }, [inviteCode, isAuthenticated, logout]);

  // When user logs in, set their first role as active dashboard
  const setRole = useDashboardStore((s) => s.setRole);
  useEffect(() => {
    if (user?.roles?.length) {
      // Admin gets special treatment — set 'admin' as role
      if (user.roles.includes('admin')) {
        setRole('admin');
        return;
      }
      const dashboardRoles: UserRole[] = ['driver', 'dispatcher', 'engineer', 'supervisor'];
      const firstRole = user.roles.find((r) => dashboardRoles.includes(r as UserRole));
      if (firstRole) {
        setRole(firstRole as UserRole);
      }
    }
  }, [user, setRole]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="login-card__spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister && inviteCode) {
      return (
        <RegisterPage
          inviteCode={inviteCode}
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }
    return <LoginPage />;
  }

  // Clear invite code from URL after successful auth
  if (inviteCode) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  return <AuthenticatedApp user={user} onLogout={logout} />;
}

function AuthenticatedApp({ user, onLogout }: { user: ReturnType<typeof useAuthStore.getState>['user']; onLogout: () => void }) {
  useWebSocket();

  const selectedRole = useDashboardStore((s) => s.selectedRole);

  // Admin gets its own full-page layout with sidebar
  if (selectedRole === 'admin' || user?.roles?.includes('admin')) {
    return <AdminDashboard />;
  }

  const Dashboard = dashboards[selectedRole as Exclude<UserRole, 'admin'>] ?? DriverDashboard;

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
                  {roleTitles[selectedRole as Exclude<UserRole, 'admin'>] ?? 'Dashboard'}
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
