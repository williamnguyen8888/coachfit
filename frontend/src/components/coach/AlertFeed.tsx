"use client";

// src/components/coach/AlertFeed.tsx
// Alert cards shown in the coach dashboard — missed workouts, overtraining, health alerts.

import { AlertTriangle, HeartPulse, Moon, Zap } from "lucide-react";
import type { AthleteAlert } from "@/lib/types/coach";

interface AlertFeedProps {
  alerts: AthleteAlert[];
  athleteName?: string;
}

const ALERT_CONFIG: Record<
  AthleteAlert["type"],
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  missed_workout: {
    icon: AlertTriangle,
    label: "Missed Workout",
    color: "var(--color-warning)",
    bg: "rgba(245, 158, 11, 0.08)",
  },
  overtraining_risk: {
    icon: Zap,
    label: "Overtraining Risk",
    color: "var(--color-danger)",
    bg: "var(--color-danger-8)",
  },
  elevated_hr: {
    icon: HeartPulse,
    label: "Elevated Resting HR",
    color: "var(--color-danger)",
    bg: "var(--color-danger-8)",
  },
  poor_sleep: {
    icon: Moon,
    label: "Poor Sleep",
    color: "var(--color-warning)",
    bg: "rgba(245, 158, 11, 0.08)",
  },
  low_hrv: {
    icon: HeartPulse,
    label: "Low HRV",
    color: "var(--color-warning)",
    bg: "rgba(245, 158, 11, 0.08)",
  },
};

function AlertCard({ alert, athleteName }: { alert: AthleteAlert; athleteName?: string }) {
  const config = ALERT_CONFIG[alert.type];
  const Icon = config.icon;

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        background: config.bg,
        border: `1px solid ${config.color}22`,
        borderLeft: `3px solid ${config.color}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--radius-sm)",
          background: `${config.color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: config.color,
            marginBottom: 2,
          }}
        >
          {config.label}
        </div>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {alert.type === "missed_workout" && (
            <>
              {athleteName && <strong style={{ color: "var(--text-primary)" }}>{athleteName}</strong>}
              {athleteName ? " missed " : "Missed "}
              {alert.workout && (
                <strong style={{ color: "var(--text-primary)" }}>
                  {alert.workout}
                </strong>
              )}{" "}
              {alert.date && `on ${alert.date}`}
            </>
          )}
          {alert.type === "overtraining_risk" && (
            <>TSB has dropped to <strong style={{ color: config.color }}>{alert.value}</strong>. Consider reducing training load.</>
          )}
          {alert.type === "elevated_hr" && (
            <>
              Resting HR <strong style={{ color: config.color }}>{alert.value} bpm</strong>
              {alert.baseline && ` vs baseline ${alert.baseline} bpm`}
            </>
          )}
          {alert.type === "poor_sleep" && (
            <>Sleep score below threshold. Monitor recovery.</>
          )}
          {alert.type === "low_hrv" && (
            <>HRV is lower than usual. Prioritize recovery.</>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertFeed({ alerts, athleteName }: AlertFeedProps) {
  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {alerts.map((alert, i) => (
        <AlertCard key={i} alert={alert} athleteName={athleteName} />
      ))}
    </div>
  );
}
