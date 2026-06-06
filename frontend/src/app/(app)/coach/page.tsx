"use client";

// src/app/(app)/coach/page.tsx
// Coach dashboard — split panel layout: roster (left) + athlete detail (right).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useIsCoach } from "@/stores/auth.store";
import { useCoachStore } from "@/stores/coach.store";
import { RosterPanel } from "@/components/coach/RosterPanel";
import { AthleteDetailPanel } from "@/components/coach/AthleteDetailPanel";
import { InviteModal } from "@/components/coach/InviteModal";
import { AssignWorkoutModal } from "@/components/coach/AssignWorkoutModal";

export default function CoachPage() {
  const router = useRouter();
  const isCoach = useIsCoach();
  const { selectedAthleteId, setSelectedAthlete } = useCoachStore();

  // Redirect non-coaches
  useEffect(() => {
    // Wait a tick — auth might still be loading
    const t = setTimeout(() => {
      if (!isCoach) router.replace("/");
    }, 500);
    return () => clearTimeout(t);
  }, [isCoach, router]);

  return (
    <>
      <div
        style={{
          display: "flex",
          height: "100%",
          overflow: "hidden",
          background: "var(--bg-primary)",
        }}
      >
        {/* ── Left: Roster panel ──────────────────────────────────── */}
        <div
          style={{
            width: selectedAthleteId ? 300 : "min(380px, 40%)",
            minWidth: selectedAthleteId ? 260 : 280,
            flexShrink: 0,
            height: "100%",
            transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          <RosterPanel />
        </div>

        {/* ── Right: Athlete detail ─────────────────────────────────── */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          {selectedAthleteId ? (
            <AthleteDetailPanel
              athleteId={selectedAthleteId}
              onClose={() => setSelectedAthlete(null)}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Modals — rendered at root level, outside scroll context */}
      <InviteModal />
      <AssignWorkoutModal />
    </>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        color: "var(--text-muted)",
        padding: "var(--space-8)",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Users size={32} style={{ opacity: 0.4 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            margin: "0 0 var(--space-2)",
          }}
        >
          Select an athlete
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            margin: 0,
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          Choose an athlete from the roster to view their calendar, activities,
          performance charts, and health data.
        </p>
      </div>
    </div>
  );
}
