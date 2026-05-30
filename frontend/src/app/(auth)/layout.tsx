// src/app/(auth)/layout.tsx
// Minimal layout for unauthenticated pages (login, register).
// No sidebar or navigation — just a centered container with a dark radial backdrop.
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
      {/* Decorative orbs */}
      <div className="auth-layout__orb auth-layout__orb--1" aria-hidden="true" />
      <div className="auth-layout__orb auth-layout__orb--2" aria-hidden="true" />

      <div className="auth-layout__container">{children}</div>

      <style>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }

        /* Top-center accent glow */
        .auth-layout::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 70% 50% at 50% -5%,
            rgba(139, 92, 246, 0.14),
            transparent 65%
          );
          pointer-events: none;
        }

        /* Bottom secondary glow */
        .auth-layout::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 50% 40% at 80% 110%,
            rgba(59, 130, 246, 0.07),
            transparent 60%
          );
          pointer-events: none;
        }

        /* Floating orbs for ambient depth */
        .auth-layout__orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          animation: orb-float 8s ease-in-out infinite;
        }

        .auth-layout__orb--1 {
          width: 400px;
          height: 400px;
          background: rgba(139, 92, 246, 0.06);
          top: -120px;
          left: -80px;
          animation-delay: 0s;
        }

        .auth-layout__orb--2 {
          width: 300px;
          height: 300px;
          background: rgba(59, 130, 246, 0.05);
          bottom: -80px;
          right: -60px;
          animation-delay: -4s;
        }

        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-layout__orb { animation: none; }
        }

        .auth-layout__container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
        }
      `}</style>
    </div>
  );
}
