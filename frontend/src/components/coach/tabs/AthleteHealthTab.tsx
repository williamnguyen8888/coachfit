"use client";

// src/components/coach/tabs/AthleteHealthTab.tsx
// Athlete health snapshot: resting HR, sleep, HRV for the coach.

import { useState, useEffect, useCallback } from "react";
import { Heart, Moon, Activity } from "lucide-react";
import { athleteDataService } from "@/lib/services/coach";

interface HealthDay {
  date: string;
  restingHr?: number | null;
  sleepScore?: number | null;
  hrv?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
}

interface AthleteHealthTabProps {
  athleteId: string;
}

function HealthMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  color: string;
  trend?: "up" | "down" | "stable" | null;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={14} color={color} />
        </div>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-end gap-1">
        <span
          className="font-metric tabular-nums"
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: value !== null ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {value ?? "—"}
        </span>
        {unit && value !== null && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginBottom: 4,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {trend && (
        <div
          style={{
            fontSize: 10,
            color:
              trend === "up"
                ? "var(--color-success)"
                : trend === "down"
                ? "var(--color-danger)"
                : "var(--text-muted)",
          }}
        >
          {trend === "up" ? "↑ improving" : trend === "down" ? "↓ declining" : "→ stable"}
        </div>
      )}
    </div>
  );
}

function SleepBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 60
      ? "var(--color-warning)"
      : "var(--color-danger)";

  return (
    <div style={{ width: "100%", height: 4, background: "var(--bg-elevated)", borderRadius: 2 }}>
      <div
        style={{
          width: `${score}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.4s ease-out",
        }}
      />
    </div>
  );
}

export function AthleteHealthTab({ athleteId }: AthleteHealthTabProps) {
  const [days, setDays] = useState<HealthDay[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
    try {
      const raw = await athleteDataService.getHealthDaily(athleteId, from, to);
      setDays(raw as HealthDay[]);
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  // Latest values
  const latest = days.length > 0 ? days[days.length - 1] : null;
  const restingHr = latest?.restingHr ?? null;
  const sleepScore = latest?.sleepScore ?? null;
  const hrv = latest?.hrv ?? null;

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 100,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
              backgroundSize: "400px 100%",
              animation: "skeleton-shimmer 1.6s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
        <HealthMetricCard
          icon={Heart}
          label="Resting HR"
          value={restingHr}
          unit="bpm"
          color="var(--color-danger)"
        />
        <HealthMetricCard
          icon={Moon}
          label="Sleep Score"
          value={sleepScore}
          unit="/100"
          color="#8b5cf6"
        />
        <HealthMetricCard
          icon={Activity}
          label="HRV"
          value={hrv ? hrv.toFixed(1) : null}
          unit="ms"
          color="var(--color-form)"
        />
      </div>

      {/* Sleep score history (last 7 days) */}
      {days.length > 0 && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Sleep — Last 7 Days
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {days.slice(-7).map((day) => {
              const score = day.sleepScore ?? 0;
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      width: 48,
                      flexShrink: 0,
                    }}
                  >
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                  <div style={{ flex: 1 }}>
                    <SleepBar score={score} />
                  </div>
                  <span
                    className="font-metric tabular-nums"
                    style={{
                      fontSize: "var(--text-xs)",
                      color:
                        score >= 80
                          ? "var(--color-success)"
                          : score >= 60
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                      fontWeight: 600,
                      width: 28,
                      textAlign: "right",
                    }}
                  >
                    {score || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {days.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-12) 0",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          No health data available
        </div>
      )}
    </div>
  );
}
