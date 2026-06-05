"use client";

// src/components/calendar/LinkActivityModal.tsx
// Modal for manually linking an activity to a planned workout calendar event.
//
// Flow:
//   User clicks "⛓ Link" on WorkoutCard
//   → Modal opens, fetches nearby activities (±2 days, same sport)
//   → User selects an activity
//   → If date diff > 1 day: show warning confirmation
//   → Calls store.linkActivity(eventId, activityId) → backend → re-fetch
//   → Modal closes

import { useState, useEffect, useCallback } from "react";
import { useCalendarStore } from "@/stores/calendar.store";
import { activitiesService } from "@/lib/services/activities";
import type { CalendarEvent } from "@/lib/types/calendar";
import { parseLocalDateString, toLocalDateString } from "@/lib/utils";
import { addLocalDays } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDurationSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null | undefined): string {
  if (!meters || meters <= 0) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function dateDiffDays(dateA: string, dateB: string): number {
  const a = parseLocalDateString(dateA);
  const b = parseLocalDateString(dateB);
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

function sportLabel(sport: string | undefined): string {
  const map: Record<string, string> = {
    running: "Running",
    cycling: "Cycling",
    swimming: "Swimming",
    triathlon: "Triathlon",
    gym: "Gym",
    yoga: "Yoga",
    hiking: "Hiking",
    rowing: "Rowing",
    other: "Other",
  };
  return sport ? (map[sport.toLowerCase()] ?? sport) : "Activity";
}

function sourceBadge(source: string | undefined) {
  const colors: Record<string, { bg: string; color: string }> = {
    strava: { bg: "rgba(252,76,2,0.12)", color: "#fc4c02" },
    garmin: { bg: "rgba(0,124,195,0.12)", color: "#007cc3" },
    coros: { bg: "rgba(20,20,30,0.1)", color: "#444" },
    manual: { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  };
  const key = (source ?? "manual").toLowerCase();
  const style = colors[key] ?? colors.manual;
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: 4,
        background: style.bg,
        color: style.color,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {source ?? "Manual"}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LinkActivityModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

// ─── Activity type (subset we need) ──────────────────────────────────────────

interface ActivityRow {
  id: string;
  name: string;
  sport: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  source: string;
  date: string; // YYYY-MM-DD local
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinkActivityModal({ event, onClose }: LinkActivityModalProps) {
  const linkActivity = useCalendarStore((s) => s.linkActivity);

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ActivityRow | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [confirmCrossDay, setConfirmCrossDay] = useState(false);

  const workoutSport = event.workout?.sport;
  const workoutDate = event.date;

  // Fetch activities in ±2 day window around the workout date
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = addLocalDays(workoutDate, -2);
      const to = addLocalDays(workoutDate, 2);
      const result = await activitiesService.list({
        from,
        to,
        size: 50,
        sort: "startedAt,desc",
      });
      // Map to ActivityRow, computing local date
      const rows: ActivityRow[] = result.content.map((a: any) => {
        const localDate = a.startedAt
          ? toLocalDateString(new Date(a.startedAt))
          : workoutDate;
        return {
          id: a.id,
          name: a.name ?? sportLabel(a.sport),
          sport: a.sport ?? "other",
          startedAt: a.startedAt,
          durationSeconds: a.durationSeconds ?? 0,
          distanceMeters: a.distanceMeters ?? null,
          source: a.source ?? "manual",
          date: localDate,
        };
      });
      setActivities(rows);
    } catch (e) {
      setError("Failed to load activities. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [workoutDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelect = (activity: ActivityRow) => {
    setSelected(activity);
    setLinkError(null);
    setConfirmCrossDay(false);
  };

  const handleLink = async () => {
    if (!selected) return;

    const diff = dateDiffDays(selected.date, workoutDate);
    if (diff > 1 && !confirmCrossDay) {
      setConfirmCrossDay(true);
      return;
    }

    setLinking(true);
    setLinkError(null);
    try {
      await linkActivity(event.id, selected.id);
      onClose();
    } catch (e: any) {
      const msg = e?.message ?? "Failed to link activity. Please try again.";
      setLinkError(msg);
    } finally {
      setLinking(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Link activity to workout"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, 95vw)",
          maxHeight: "80vh",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "scaleIn 180ms cubic-bezier(0.34,1.2,0.64,1) forwards",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              ⛓ Link Activity
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                margin: "3px 0 0",
              }}
            >
              Select an activity to link to:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {event.title}
              </strong>{" "}
              ({workoutDate})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 28,
              height: 28,
              border: "none",
              background: "var(--bg-input)",
              borderRadius: "50%",
              color: "var(--text-muted)",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body — activity list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
          }}
        >
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              Loading activities…
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#ef4444",
                fontSize: 13,
              }}
            >
              {error}
              <br />
              <button
                type="button"
                onClick={fetchActivities}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  color: "#ef4444",
                  fontSize: 12,
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && activities.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No activities found within ±2 days of {workoutDate}.
              <br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                Import an activity via Strava, Garmin, or file upload first.
              </span>
            </div>
          )}

          {!loading &&
            !error &&
            activities.map((activity) => {
              const diff = dateDiffDays(activity.date, workoutDate);
              const sportMatch =
                !workoutSport ||
                activity.sport.toLowerCase() === workoutSport.toLowerCase() ||
                activity.sport.toLowerCase().includes(workoutSport.toLowerCase());
              const isSelected = selected?.id === activity.id;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => handleSelect(activity)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    marginBottom: 6,
                    background: isSelected
                      ? "rgba(16,185,129,0.08)"
                      : "var(--bg-input)",
                    border: isSelected
                      ? "1.5px solid rgba(16,185,129,0.4)"
                      : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 120ms ease-out",
                    opacity: sportMatch ? 1 : 0.65,
                  }}
                >
                  {/* Selected check */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: isSelected
                        ? "#10b981"
                        : "var(--border-color)",
                      border: isSelected
                        ? "none"
                        : "1.5px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 120ms",
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          color: "white",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Activity info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {activity.name}
                      </span>
                      {sourceBadge(activity.source)}
                      {!sportMatch && (
                        <span
                          style={{
                            fontSize: 8,
                            background: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: 4,
                            padding: "1px 4px",
                            fontWeight: 700,
                          }}
                        >
                          ≠ Sport
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>📅 {activity.date}</span>
                      <span>⏱ {formatDurationSecs(activity.durationSeconds)}</span>
                      {activity.distanceMeters && (
                        <span>📏 {formatDistance(activity.distanceMeters)}</span>
                      )}
                      <span style={{ opacity: 0.7 }}>
                        {sportLabel(activity.sport)}
                      </span>
                    </div>
                  </div>

                  {/* Date diff badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 5,
                      background:
                        diff === 0
                          ? "rgba(16,185,129,0.12)"
                          : diff <= 1
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(239,68,68,0.08)",
                      color:
                        diff === 0
                          ? "#10b981"
                          : diff <= 1
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {diff === 0 ? "Same day" : `±${diff}d`}
                  </div>
                </button>
              );
            })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Cross-day warning */}
          {confirmCrossDay && selected && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--text-primary)",
              }}
            >
              ⚠️ This activity is from{" "}
              <strong>{selected.date}</strong>, but the workout is on{" "}
              <strong>{workoutDate}</strong> (
              {dateDiffDays(selected.date, workoutDate)} day
              {dateDiffDays(selected.date, workoutDate) !== 1 ? "s" : ""}{" "}
              apart). Are you sure you want to link them?
            </div>
          )}

          {/* Link error */}
          {linkError && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "#ef4444",
              }}
            >
              {linkError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected || linking}
              onClick={handleLink}
              style={{
                padding: "8px 20px",
                background: selected
                  ? confirmCrossDay
                    ? "#f59e0b"
                    : "#10b981"
                  : "var(--border-color)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: selected ? "white" : "var(--text-muted)",
                fontSize: 13,
                cursor: selected && !linking ? "pointer" : "not-allowed",
                fontWeight: 700,
                transition: "all 150ms ease-out",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {linking ? (
                "Linking…"
              ) : confirmCrossDay ? (
                "Yes, Link Anyway"
              ) : (
                <>⛓ Link Activity</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
