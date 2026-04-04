import { useDashboardStore } from '@/store';
import type { UserRole } from '@/types';
import clsx from 'clsx';

const roles: { id: UserRole; label: string }[] = [
  { id: 'driver', label: 'Driver' },
  { id: 'dispatcher', label: 'Dispatcher' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'supervisor', label: 'Supervisor' },
];

export function RoleSwitcher() {
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const setRole = useDashboardStore((s) => s.setRole);

  return (
    <div className="switcher-pill">
      {roles.map((r) => (
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
