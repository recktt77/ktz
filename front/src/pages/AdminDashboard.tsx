import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { DriverDashboard } from './DriverDashboard';
import { DispatcherDashboard } from './DispatcherDashboard';
import { EngineerDashboard } from './EngineerDashboard';
import { SupervisorDashboard } from './SupervisorDashboard';
import { LocomotiveSwitcher } from '@/widgets/common/LocomotiveSwitcher';
import { ConnectionBadge } from '@/widgets/common/ConnectionBadge';
import * as authApi from '@/services/api/authService';
import { SimulatorPanel } from '@/widgets/admin/SimulatorPanel';
import type { Invitation } from '@/types';

type AdminTab = 'driver' | 'dispatcher' | 'engineer' | 'supervisor' | 'settings';

const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
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
  {
    id: 'settings',
    label: 'Настройки',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('driver');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <img src="/header-logo.svg" alt="KTЖ" className="h-8 w-auto" />
          <span className="admin-sidebar__brand">КТЖ</span>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`admin-sidebar__link ${activeTab === item.id ? 'admin-sidebar__link--active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">
              {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="admin-sidebar__user-info">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user?.full_name ?? 'Admin'}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Администратор</div>
            </div>
          </div>
          <button onClick={logout} className="admin-sidebar__logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar__title">
            {navItems.find((i) => i.id === activeTab)?.label?.toUpperCase() ?? 'АДМИН'}
          </span>
          {activeTab !== 'settings' && (
            <div className="flex items-center gap-3">
              <LocomotiveSwitcher />
              <ConnectionBadge />
            </div>
          )}
        </header>
        <div className="admin-content">
          {activeTab === 'driver' && <DriverDashboard />}
          {activeTab === 'dispatcher' && <DispatcherDashboard />}
          {activeTab === 'engineer' && <EngineerDashboard />}
          {activeTab === 'supervisor' && <SupervisorDashboard />}
          {activeTab === 'settings' && (
            <>
              <SimulatorPanel />
              <AdminSettings />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Машинист' },
  { value: 'dispatcher', label: 'Диспетчер' },
  { value: 'engineer', label: 'Инженер' },
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'admin', label: 'Администратор' },
];

function AdminSettings() {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('driver');
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [rolesData, invData] = await Promise.all([
        authApi.getRoles(),
        authApi.getInvitations(),
      ]);
      setRoles(rolesData);
      setInvitations(invData);
    } catch {
      // silent — non-critical
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    const role = roles.find((r) => r.name === selectedRole);
    if (!role) {
      setError('Роль не найдена');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.createInvitation({
        email: email.trim(),
        role_id: role.id,
      });
      setSuccess(`Приглашение отправлено на ${email.trim()}. Код: ${result.invite_code ?? '—'}`);
      setEmail('');
      loadData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Ошибка при отправке';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels: Record<string, { text: string; color: string }> = {
    pending: { text: 'Ожидает', color: 'var(--accent-amber)' },
    accepted: { text: 'Принят', color: 'var(--status-normal)' },
    expired: { text: 'Истёк', color: 'var(--text-muted)' },
    revoked: { text: 'Отозван', color: 'var(--status-critical)' },
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Invite form */}
      <div className="panel p-6">
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Пригласить пользователя
        </h2>

        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--status-critical)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {success && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: 'rgba(52,211,153,0.08)', color: 'var(--status-normal)', border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {success}
            <button onClick={() => setSuccess(null)} className="ml-auto opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@ktj.kz"
              className="admin-input"
              required
              disabled={loading}
            />
          </div>

          <div className="w-52">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Роль
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="admin-input"
              disabled={loading}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="admin-btn"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <span className="login-card__spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                Отправить приглашение
              </>
            )}
          </button>
        </form>
      </div>

      {/* Invitations list */}
      <div className="panel p-6">
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Приглашения
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
            ({invitations.length})
          </span>
        </h2>

        {invitations.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет отправленных приглашений</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Создано</th>
                  <th>Истекает</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const st = statusLabels[inv.status] ?? { text: inv.status, color: 'var(--text-secondary)' };
                  const roleName = inv.role?.name
                    ? (ROLE_OPTIONS.find((r) => r.value === inv.role?.name)?.label ?? inv.role.name)
                    : '—';
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-sm">{inv.email}</td>
                      <td>{roleName}</td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: `color-mix(in srgb, ${st.color} 12%, transparent)`, color: st.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                          {st.text}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(inv.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(inv.expires_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
