/**
 * Base HTTP client for backend API communication.
 * Handles JWT auth headers, token refresh, and error normalization.
 */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokenExpired: (() => void) | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function loadStoredTokens(): void {
  accessToken = localStorage.getItem('access_token');
  refreshToken = localStorage.getItem('refresh_token');
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnTokenExpired(callback: () => void): void {
  onTokenExpired = callback;
}

async function request<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retry = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (retry.ok) return retry.json() as Promise<T>;
    }
    clearTokens();
    onTokenExpired?.();
    throw { status: 401, message: 'Session expired' } satisfies ApiError;
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const errBody = await res.json();
      message = errBody.message ?? message;
    } catch { /* ignore parse error */ }
    throw { status: res.status, message } satisfies ApiError;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(
      `${(await import('@/lib/constants')).AUTH_API_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export function createApiClient(baseUrl: string) {
  return {
    get: <T>(path: string) => request<T>(baseUrl, path, 'GET'),
    post: <T>(path: string, body?: unknown) => request<T>(baseUrl, path, 'POST', body),
    patch: <T>(path: string, body?: unknown) => request<T>(baseUrl, path, 'PATCH', body),
    put: <T>(path: string, body?: unknown) => request<T>(baseUrl, path, 'PUT', body),
    delete: <T>(path: string) => request<T>(baseUrl, path, 'DELETE'),
  };
}
