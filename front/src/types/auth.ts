import type { UserRole } from './common';

// ──── Auth Service types ────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  station_id: string;
  station_name: string;
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
  invitation_code: string;
  name: string;
  phone: string;
  password: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  station_id: string;
  used: boolean;
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
