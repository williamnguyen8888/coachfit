// src/components/layout/AuthGuard.tsx
// Client-side route protection for authenticated pages.
//
// Reads auth status from Zustand store and redirects to /login if the
// user is not authenticated. Shows AppLoader while status is resolving.
// This component is rendered inside AuthProvider so status is never 'idle'
// when AuthGuard mounts.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/stores/auth.store";
import { AppLoader } from "@/components/ui/AppLoader";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const status = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "idle") {
    return <AppLoader />;
  }

  if (status === "unauthenticated") {
    // Rendering null while the redirect in useEffect fires
    return null;
  }

  return <>{children}</>;
}
