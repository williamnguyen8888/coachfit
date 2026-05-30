// src/components/providers/AuthProvider.tsx
// Client component that initialises authentication on app mount.
//
// Responsibilities:
//   1. Call initAuth() once → silently restore session from refresh-token cookie
//   2. Show AppLoader while the auth check is in-flight
//   3. Sync data-theme attribute to the <html> element (consumed by CSS tokens)

"use client";

import { useEffect } from "react";
import { useAuthStore, useAuthStatus } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { AppLoader } from "@/components/ui/AppLoader";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const status = useAuthStatus();
  const initAuth = useAuthStore((s) => s.initAuth);
  const theme = useUIStore((s) => s.theme);

  // ── Sync data-theme → <html> ──────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── Run auth hydration once on mount ─────────────────────────────────────
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Show skeleton while auth state is being determined
  if (status === "idle" || status === "loading") {
    return <AppLoader />;
  }

  return <>{children}</>;
}
