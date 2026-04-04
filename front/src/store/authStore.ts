import { create } from 'zustand';
import type { AuthUser } from '@/types';
import { loadStoredTokens, getAccessToken, clearTokens, setOnTokenExpired } from '@/services/api/client';
import * as authApi from '@/services/api/authService';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => {
  // Wire up token expiration callback
  setOnTokenExpired(() => {
    set({ user: null, isAuthenticated: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true, // start true — we'll check stored token on mount
    error: null,

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authApi.login({ email, password });
        set({ user: res.user, isAuthenticated: true, isLoading: false });
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Login failed';
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch {
        /* ignore */
      }
      set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
      loadStoredTokens();
      const token = getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      try {
        const user = await authApi.getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});
