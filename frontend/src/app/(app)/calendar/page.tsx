"use client";

// src/app/(app)/calendar/page.tsx
// Calendar page — week and month views against the live backend API.
// Ticket: F10 — Calendar Views

import { useEffect } from "react";
import { useCalendarStore } from "@/stores/calendar.store";
import { WeekNavBar } from "@/components/calendar/WeekNavBar";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { useIsMobile } from "@/hooks/useMediaQuery";

// ─── Error state ──────────────────────────────────────────────────────────────

function CalendarError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        padding: "var(--space-8)",
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ fontSize: 40 }}>📅</div>
      <div style={{ fontSize: "var(--text-base)", textAlign: "center" }}>
        {message}
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: "var(--space-2) var(--space-5)",
          background: "var(--color-accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "white",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const {
    viewMode,
    anchorDate,
    fetchCurrentRange,
    error,
  } = useCalendarStore();

  // Fetch events whenever the visible range changes (view mode or anchor date)
  useEffect(() => {
    fetchCurrentRange();
  }, [viewMode, anchorDate, fetchCurrentRange]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Shared nav bar (handles both week and month modes) */}
      <WeekNavBar />

      {/* Calendar grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: isMobile ? "auto" : "hidden",
        }}
      >
        {error ? (
          <CalendarError message={error} onRetry={fetchCurrentRange} />
        ) : viewMode === "week" ? (
          <WeekView />
        ) : (
          <MonthView />
        )}
      </div>
    </div>
  );
}
