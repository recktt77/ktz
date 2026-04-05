import { useEffect, useState, useMemo } from 'react';
import { useDashboardStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';

import { ConnectionBadge } from '@/widgets/common/ConnectionBadge';
import { LocomotiveSwitcher } from '@/widgets/common/LocomotiveSwitcher';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { DispatcherDashboard } from '@/pages/DispatcherDashboard';
import { EngineerDashboard } from '@/pages/EngineerDashboard';
import { SupervisorDashboard } from '@/pages/SupervisorDashboard';
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

/** Remove /register path and query string, leave at / */
function cleanUrl() {
  if (window.location.pathname !== '/' || window.location.search) {
    window.history.replaceState({}, '', '/');
  }
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

  // If path is /register but no invite code → redirect to /
  useEffect(() => {
    if (window.location.pathname === '/register' && !inviteCode) {
      cleanUrl();
    }
  }, [inviteCode]);

  // When user logs in, set their first role as active dashboard
  const setRole = useDashboardStore((s) => s.setRole);
  useEffect(() => {
    if (user?.roles?.length) {
      const dashboardRoles: UserRole[] = ['driver', 'dispatcher', 'engineer', 'supervisor'];
      // Admin can access all dashboards — default to driver
      if (user.roles.includes('admin')) {
        setRole('driver');
        return;
      }
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

  // Clear invite code / register path from URL after successful auth
  cleanUrl();

  return <AuthenticatedApp user={user} onLogout={logout} />;
}

const sidebarNav: { id: Exclude<UserRole, 'admin'>; label: string; icon: React.ReactNode }[] = [
  {
    id: 'driver',
    label: 'Машинист',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    id: 'dispatcher',
    label: 'Диспетчер',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: 'engineer',
    label: 'Инженер',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 'supervisor',
    label: 'Руководитель',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

function AuthenticatedApp({ user, onLogout }: { user: ReturnType<typeof useAuthStore.getState>['user']; onLogout: () => void }) {
  useWebSocket();

  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const setRole = useDashboardStore((s) => s.setRole);

  const Dashboard = dashboards[selectedRole as Exclude<UserRole, 'admin'>] ?? DriverDashboard;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <img src="/header-logo.svg" alt="КТЖ" className="h-8 w-auto" />
          <span className="admin-sidebar__brand">КТЖ</span>
        </div>

        <nav className="admin-sidebar__nav">
          {sidebarNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setRole(item.id)}
              className={`admin-sidebar__link ${selectedRole === item.id ? 'admin-sidebar__link--active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="admin-sidebar__user-info">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user?.full_name ?? 'User'}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {roleTitles[selectedRole as Exclude<UserRole, 'admin'>] ?? ''}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="admin-sidebar__logout"
            title="Выйти"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header className="app-header sticky top-0 z-50 px-3 py-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-sm font-bold tracking-tight uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                {roleTitles[selectedRole as Exclude<UserRole, 'admin'>] ?? 'Dashboard'}
              </h1>
              <LocomotiveSwitcher />
            </div>
            <div className="flex items-center gap-3">
              <ConnectionBadge />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <main style={{ flex: 1, padding: '8px 12px' }}>
          <Dashboard />
        </main>
      </div>
    </div>
  );
}
