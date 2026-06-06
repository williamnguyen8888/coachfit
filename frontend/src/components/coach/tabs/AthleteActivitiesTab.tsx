"use client";

// src/components/coach/tabs/AthleteActivitiesTab.tsx
// Paginated list of athlete activities for the coach to review.

import { useState, useEffect, useCallback } from "react";
import { Activity, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { athleteDataService } from "@/lib/services/coach";
import type { RecentActivity } from "@/lib/types/coach";
import { ActivityComments } from "@/components/activities/ActivityComments";

const SPORT_COLORS: Record<string, string> = {
  cycling: "#3b82f6",
  running: "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null): string {
  if (!meters) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

interface AthleteActivitiesTabProps {
  athleteId: string;
}

export function AthleteActivitiesTab({ athleteId }: AthleteActivitiesTabProps) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await athleteDataService.getActivities(athleteId, { page, size: 10 });
      setActivities(res.content);
      setTotalPages(res.totalPages);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId, page]);

  useEffect(() => {
    setPage(0);
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 64,
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

  if (activities.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-12) 0",
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        <Activity size={32} style={{ marginBottom: "var(--space-3)", opacity: 0.4 }} />
        <p>No activities yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {activities.map((activity) => {
        const color = SPORT_COLORS[activity.sport] ?? "#8b5cf6";
        const isExpanded = expandedId === activity.id;

        return (
          <div key={activity.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : activity.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: isExpanded ? "var(--bg-elevated)" : "var(--bg-surface)",
                border: `1px solid ${isExpanded ? "var(--border-default)" : "var(--border-subtle)"}`,
                borderRadius: isExpanded ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                borderLeft: `3px solid ${color}`,
                transition: "all var(--duration-micro) var(--ease-standard)",
              }}
            >
              {/* Sport icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-sm)",
                  background: `${color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Activity size={14} color={color} />
              </div>

              {/* Name & date */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold truncate"
                  style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
                >
                  {activity.name}
                </div>
                <div
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
                >
                  {new Date(activity.startedAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0">
                <StatPill label="Duration" value={formatDuration(activity.durationSeconds)} />
                <StatPill label="Distance" value={formatDistance(activity.distanceMeters)} />
                {activity.tss !== null && (
                  <StatPill label="TSS" value={String(Math.round(activity.tss))} color="var(--color-fitness)" />
                )}
                <MessageCircle size={14} style={{ color: "var(--text-muted)" }} />
              </div>
            </button>

            {/* Expanded: comments */}
            {isExpanded && (
              <div
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderTop: "none",
                  borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                  padding: "var(--space-4)",
                }}
              >
                <ActivityComments activityId={activity.id} />
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              width: 32, height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={15} />
          </button>

          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {page + 1} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              width: 32, height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        className="font-metric tabular-nums"
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: color ?? "var(--text-primary)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
