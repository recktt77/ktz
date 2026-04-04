import { useDashboardStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import clsx from 'clsx';

const allRoles: { id: UserRole; label: string }[] = [
  { id: 'driver', label: 'Машинист' },
  { id: 'dispatcher', label: 'Диспетчер' },
  { id: 'engineer', label: 'Инженер' },
  { id: 'supervisor', label: 'Руководитель' },
];

export function RoleSwitcher() {
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const setRole = useDashboardStore((s) => s.setRole);
  const user = useAuthStore((s) => s.user);

  // Show only roles the user has. If no user (dev mode), show all.
  const visibleRoles = user?.roles?.length
    ? allRoles.filter((r) => user.roles.includes(r.id))
    : allRoles;

  // Don't render switcher if user has only one role
  if (visibleRoles.length <= 1) return null;

  return (
    <div className="switcher-pill">
      {visibleRoles.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={clsx(
            'switcher-pill__btn',
            selectedRole === r.id && 'switcher-pill__btn--active',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
