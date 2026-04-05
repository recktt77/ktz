import { NORMALIZATION_API_URL } from '@/lib/constants';

const BASE = `${NORMALIZATION_API_URL}/reports`;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ReportRole = 'driver' | 'dispatcher' | 'engineer' | 'supervisor';

async function downloadBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `report_${Date.now()}`;
  const blob = await res.blob();
  return { blob, filename };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(role: ReportRole, locomotiveId?: string) {
  const path = role === 'supervisor'
    ? `${BASE}/pdf/supervisor`
    : `${BASE}/pdf/${role}/${locomotiveId}`;
  const { blob, filename } = await downloadBlob(path);
  triggerDownload(blob, filename);
}

export async function downloadCsv(role: ReportRole, locomotiveId?: string) {
  const path = role === 'supervisor'
    ? `${BASE}/csv/supervisor`
    : `${BASE}/csv/${role}/${locomotiveId}`;
  const { blob, filename } = await downloadBlob(path);
  triggerDownload(blob, filename);
}
