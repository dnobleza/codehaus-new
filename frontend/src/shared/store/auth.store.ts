import { create } from 'zustand';
import type { AuthUser } from '@/shared/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
}

/**
 * In-memory only auth store — deliberately not persisted to localStorage
 * (architecture doc §7 security rationale: limits XSS exposure of the
 * access token). Refresh token lives in an httpOnly cookie set by the
 * backend and is never touched from JS.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
}));
