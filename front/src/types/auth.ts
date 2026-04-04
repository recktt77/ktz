import type { UserRole } from './common';

// ──── Auth Service types ────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  roles: UserRole[];
  station_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  invite_code: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  station_id: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface Station {
  id: string;
  name: string;
  railway_id: string;
  latitude?: number;
  longitude?: number;
}
