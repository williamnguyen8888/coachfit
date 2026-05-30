// src/app/(onboarding)/layout.tsx
// Fullscreen layout wrapper for the onboarding wizard.
// Shares the same dark/atmospheric aesthetic as the auth layout.
// Redirects unauthenticated users back to /login.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useAuthStatus();
  const router = useRouter();
  const completed = useOnboardingStore((s) => s.completed);

  // Guard: only authenticated users may access onboarding
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // If wizard is already completed, push to dashboard
  useEffect(() => {
    if (completed) {
      router.replace("/");
    }
  }, [completed, router]);

  if (status === "unauthenticated" || completed) return null;

  return (
    <div className="onb-layout">
      {/* Ambient decorative orbs */}
      <div className="onb-layout__orb onb-layout__orb--1" aria-hidden="true" />
      <div className="onb-layout__orb onb-layout__orb--2" aria-hidden="true" />
      <div className="onb-layout__orb onb-layout__orb--3" aria-hidden="true" />

      <div className="onb-layout__inner">{children}</div>

      <style>{`
        .onb-layout {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 32px;
          position: relative;
          overflow: hidden;
        }

        /* Top accent glow */
        .onb-layout::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 45% at 50% -10%,
            rgba(139, 92, 246, 0.18),
            transparent 60%
          );
          pointer-events: none;
        }

        /* Bottom secondary glow */
        .onb-layout::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 60% 40% at 80% 110%,
            rgba(59, 130, 246, 0.08),
            transparent 60%
          );
          pointer-events: none;
        }

        .onb-layout__orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
          animation: onb-orb-float 10s ease-in-out infinite;
        }

        .onb-layout__orb--1 {
          width: 500px;
          height: 500px;
          background: rgba(139, 92, 246, 0.07);
          top: -180px;
          left: -100px;
          animation-delay: 0s;
        }

        .onb-layout__orb--2 {
          width: 350px;
          height: 350px;
          background: rgba(59, 130, 246, 0.05);
          bottom: -100px;
          right: -80px;
          animation-delay: -5s;
        }

        .onb-layout__orb--3 {
          width: 250px;
          height: 250px;
          background: rgba(16, 185, 129, 0.04);
          top: 40%;
          right: 10%;
          animation-delay: -2.5s;
        }

        @keyframes onb-orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-24px) scale(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          .onb-layout__orb { animation: none; }
        }

        .onb-layout__inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
      `}</style>
    </div>
  );
}
