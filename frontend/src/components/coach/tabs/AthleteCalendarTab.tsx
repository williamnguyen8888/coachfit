"use client";

// src/components/coach/tabs/AthleteCalendarTab.tsx
// Shows the athlete's calendar (read-only + coach can assign workouts).

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, PlusCircle, CheckCircle, XCircle } from "lucide-react";
import { athleteDataService } from "@/lib/services/coach";
import { useCoachStore } from "@/stores/coach.store";
import type { CalendarEvent } from "@/lib/types/calendar";

const SPORT_COLORS: Record<string, string> = {
  cycling: "#3b82f6",
  running: "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
  default: "#8b5cf6",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle,
  skipped: XCircle,
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AthleteCalendarTabProps {
  athleteId: string;
  onAssignWorkout?: (date: string) => void;
}

export function AthleteCalendarTab({ athleteId, onAssignWorkout }: AthleteCalendarTabProps) {
  const openAssignModal = useCoachStore((s) => s.openAssignModal);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const from = formatDate(days[0]);
  const to = formatDate(days[6]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await athleteDataService.getCalendar(athleteId, from, to);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsForDay = (date: Date) => {
    const key = formatDate(date);
    return events.filter((e) => e.date === key);
  };

  const isToday = (date: Date) => formatDate(date) === formatDate(new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(getMonday(d));
          }}
          style={{
            width: 32, height: 32,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={15} />
        </button>

        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
          {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" — "}
          {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>

        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(getMonday(d));
          }}
          style={{
            width: 32, height: 32,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-2)" }}>
        {/* Day headers */}
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: isToday(days[i]) ? "var(--color-accent)" : "var(--text-muted)",
              paddingBottom: "var(--space-1)",
            }}
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day, i) => {
          const dayEvents = eventsForDay(day);
          const today = isToday(day);

          return (
            <div
              key={i}
              style={{
                minHeight: 100,
                background: "var(--bg-surface)",
                border: today
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              {/* Date number */}
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: today ? 700 : 500,
                  color: today ? "var(--color-accent)" : "var(--text-muted)",
                  textAlign: "center",
                  marginBottom: 2,
                }}
              >
                {day.getDate()}
              </div>

              {/* Events */}
              {loading ? (
                <div
                  style={{
                    height: 28, borderRadius: "var(--radius-sm)",
                    background: "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
                    backgroundSize: "400px 100%",
                    animation: "skeleton-shimmer 1.6s ease-in-out infinite",
                  }}
                />
              ) : (
                dayEvents.map((event) => {
                  const sport = event.workout?.sport ?? "default";
                  const color = SPORT_COLORS[sport] ?? SPORT_COLORS.default;
                  const StatusIcon =
                    STATUS_ICONS[event.status] ?? null;

                  return (
                    <div
                      key={event.id}
                      title={event.title}
                      style={{
                        padding: "2px 5px",
                        borderRadius: "var(--radius-sm)",
                        background: `${color}18`,
                        borderLeft: `2px solid ${color}`,
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        overflow: "hidden",
                        opacity: event.status === "skipped" ? 0.5 : 1,
                      }}
                    >
                      {StatusIcon && <StatusIcon size={9} color={event.status === "skipped" ? "var(--color-danger)" : "var(--color-success)"} />}
                      <span
                        style={{
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          flex: 1,
                        }}
                      >
                        {event.title}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Add workout button */}
              <button
                onClick={() => {
                  if (onAssignWorkout) onAssignWorkout(formatDate(day));
                  else openAssignModal([athleteId]);
                }}
                style={{
                  marginTop: "auto",
                  width: "100%",
                  padding: "2px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity var(--duration-micro)",
                }}
                className="assign-btn"
                title="Assign workout"
              >
                <PlusCircle size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .assign-btn { opacity: 0 !important; }
        div:hover > .assign-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
