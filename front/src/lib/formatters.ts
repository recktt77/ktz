import type { ComponentStatus, CommunicationStatus, HealthLabel } from '@/types';

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function componentStatusLabel(status: ComponentStatus): string {
  const map: Record<ComponentStatus, string> = {
    ok: 'OK',
    degraded: 'Degraded',
    fault: 'Fault',
    offline: 'Offline',
  };
  return map[status];
}

export function commStatusLabel(status: CommunicationStatus): string {
  const map: Record<CommunicationStatus, string> = {
    online: 'Online',
    degraded: 'Degraded',
    offline: 'Offline',
  };
  return map[status];
}

export function healthColor(label: HealthLabel): string {
  const map: Record<HealthLabel, string> = {
    Good: 'text-emerald-400',
    Warning: 'text-amber-400',
    Critical: 'text-red-500',
  };
  return map[label];
}

export function healthBgGradient(label: HealthLabel): string {
  const map: Record<HealthLabel, string> = {
    Good: 'from-emerald-500/10 to-transparent',
    Warning: 'from-amber-500/10 to-transparent',
    Critical: 'from-red-500/10 to-transparent',
  };
  return map[label];
}
