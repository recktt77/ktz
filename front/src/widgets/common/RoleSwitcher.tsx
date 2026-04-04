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
    <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
      {roles.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={clsx(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            selectedRole === r.id
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
