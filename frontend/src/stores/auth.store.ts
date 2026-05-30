// src/stores/auth.store.ts — Auth Zustand store placeholder (full impl in F03)
import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
}

interface AuthActions {
  setAuth: (userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  userId: null,
  email: null,
  setAuth: (userId, email) => set({ isAuthenticated: true, userId, email }),
  clearAuth: () => set({ isAuthenticated: false, userId: null, email: null }),
}));
