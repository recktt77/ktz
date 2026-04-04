/**
 * Auth Service API client.
 * Maps to Auth Service endpoints (POST /auth/login, /auth/register, etc.)
 */
import { createApiClient, setTokens, clearTokens } from './client';
import { AUTH_API_URL } from '@/lib/constants';
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest, Invitation, Station } from '@/types';

const api = createApiClient(AUTH_API_URL);

// ──── Public endpoints ────

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', credentials);
  setTokens(res.access_token, res.refresh_token);
  return res;
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/register', data);
  setTokens(res.access_token, res.refresh_token);
  return res;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}

export async function refreshSession(): Promise<void> {
  // Handled automatically by the client interceptor
  await api.post('/auth/refresh');
}

// ──── User management ────

export async function getCurrentUser(): Promise<AuthUser> {
  return api.get<AuthUser>('/users/me');
}

export async function getUsers(): Promise<AuthUser[]> {
  return api.get<AuthUser[]>('/users');
}

export async function getUser(id: string): Promise<AuthUser> {
  return api.get<AuthUser>(`/users/${encodeURIComponent(id)}`);
}

export async function updateUser(id: string, data: Partial<AuthUser>): Promise<AuthUser> {
  return api.patch<AuthUser>(`/users/${encodeURIComponent(id)}`, data);
}

// ──── Invitations ────

export async function createInvitation(data: {
  email: string;
  role: string;
  station_id: string;
}): Promise<Invitation> {
  return api.post<Invitation>('/auth/invitations', data);
}

// ──── Reference data ────

export async function getRoles(): Promise<{ id: string; name: string }[]> {
  return api.get('/roles');
}

export async function getStations(): Promise<Station[]> {
  return api.get<Station[]>('/stations');
}
