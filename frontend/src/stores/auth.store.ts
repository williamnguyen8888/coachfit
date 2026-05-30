// src/stores/auth.store.ts
// Zustand auth store — source of truth for user identity in the UI.
//
// Responsibilities:
//   • login() / logout() / initAuth() lifecycle
//   • Decoded JWT payload (role, tier, email) → drives conditional rendering
//   • handleSessionExpired() → called by API client on unrecoverable 401
//
// What lives elsewhere:
//   • Raw access token → lib/auth.ts (module variable, not in React state)
//   • HTTP calls → lib/api.ts
//   • Route redirects → AuthGuard component (reads status from this store)

import { create } from "zustand";
import {
  setAccessToken,
  clearAccessToken,
  decodeJwt,
  type JwtPayload,
} from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { isApiError } from "@/lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: JwtPayload["role"];
  tier: JwtPayload["tier"];
  /** Display name from the most recent /athlete response; null until loaded */
  fullName: string | null;
}

/** The four lifecycle states of the auth flow */
export type AuthStatus =
  | "idle" // initial state before initAuth() runs
  | "loading" // initAuth / login in progress
  | "authenticated" // valid session
  | "unauthenticated"; // no session, or session expired

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Last auth error message (e.g. wrong password) */
  error: string | null;
}

interface AuthActions {
  /**
   * Called once on app mount.
   * Attempts to restore a session via the httpOnly refresh-token cookie.
   * Sets status → authenticated | unauthenticated.
   */
  initAuth: () => Promise<void>;

  /**
   * Email + password login.
   * On success: stores token in memory, decodes user, sets authenticated.
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Clears the session: calls logout endpoint, wipes token + state.
   */
  logout: () => Promise<void>;

  /**
   * Called by the API client when a refresh attempt fails (unrecoverable 401).
   * Wipes state without calling the logout endpoint (token already invalid).
   */
  handleSessionExpired: () => void;

  /**
   * Decode a freshly obtained token and merge the payload into user state.
   * Called after token refresh to pick up new tier / role.
   */
  hydrateFromToken: (token: string) => void;

  /** Clear last auth error */
  clearError: () => void;
}

// ─── Backend response shapes ──────────────────────────────────────────────────

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: User["role"];
    tier: User["tier"];
    fullName?: string;
  };
}

interface RefreshResponse {
  token: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  // ── initAuth ──────────────────────────────────────────────────────────────
  initAuth: async () => {
    set({ status: "loading", error: null });
    try {
      // Attempt silent refresh via httpOnly cookie
      const res = await apiFetch<RefreshResponse>("/auth/refresh", {
        method: "POST",
        skipAuth: true, // no bearer token yet
      });
      setAccessToken(res.token);
      get().hydrateFromToken(res.token);
      set({ status: "authenticated" });
    } catch {
      // No valid refresh token → user must log in
      clearAccessToken();
      set({ status: "unauthenticated", user: null });
    }
  },

  // ── login ─────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    set({ status: "loading", error: null });
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      setAccessToken(res.token);
      set({
        status: "authenticated",
        error: null,
        user: {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          tier: res.user.tier,
          fullName: res.user.fullName ?? null,
        },
      });
    } catch (e) {
      clearAccessToken();
      const message = isApiError(e)
        ? e.message
        : "Login failed. Please try again.";
      set({ status: "unauthenticated", error: message, user: null });
      throw e; // re-throw so form can handle it
    }
  },

  // ── logout ────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Best-effort — always clear local state
    }
    clearAccessToken();
    set({ status: "unauthenticated", user: null, error: null });
  },

  // ── handleSessionExpired ──────────────────────────────────────────────────
  handleSessionExpired: () => {
    clearAccessToken();
    set({
      status: "unauthenticated",
      user: null,
      error: "Your session expired. Please log in again.",
    });
  },

  // ── hydrateFromToken ──────────────────────────────────────────────────────
  hydrateFromToken: (token: string) => {
    const payload = decodeJwt(token);
    if (!payload) return;
    set((s) => ({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tier: payload.tier,
        // Preserve fullName if we already have it from a login response
        fullName: s.user?.fullName ?? null,
      },
    }));
  },

  // ── clearError ────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));

// ─── Selector hooks (stable references, avoid re-subscribe to entire store) ──

export function useUser(): User | null {
  return useAuthStore((s) => s.user);
}

export function useAuthStatus(): AuthStatus {
  return useAuthStore((s) => s.status);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.status === "authenticated");
}

/** True for role=coach or role=admin */
export function useIsCoach(): boolean {
  return useAuthStore(
    (s) => s.user?.role === "coach" || s.user?.role === "admin",
  );
}

/** True for tier ≥ pro (pro | elite | coach | admin) */
export function useIsPro(): boolean {
  return useAuthStore((s) =>
    ["pro", "elite", "coach", "admin"].includes(s.user?.tier ?? ""),
  );
}
