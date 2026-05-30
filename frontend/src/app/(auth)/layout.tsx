// src/app/(auth)/layout.tsx
// Minimal layout for unauthenticated pages (login, register).
// No sidebar or navigation — just a centered container.
// Redirects to dashboard if the user is already authenticated.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/stores/auth.store";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useAuthStatus();
  const router = useRouter();

  // Redirect authenticated users away from login/register
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Don't render login UI if we're about to redirect
  if (status === "authenticated") return null;

  return (
    <div className="auth-layout">
      <div className="auth-layout__container">{children}</div>

      <style>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle gradient backdrop */
        .auth-layout::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 60% at 50% -10%,
            color-mix(in srgb, var(--brand-primary) 12%, transparent),
            transparent
          );
          pointer-events: none;
        }

        .auth-layout__container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
        }
      `}</style>
    </div>
  );
}
