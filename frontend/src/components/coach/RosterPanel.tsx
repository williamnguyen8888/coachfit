"use client";

// src/components/coach/RosterPanel.tsx
// Left panel — searchable, filterable athlete roster.

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, Users, RefreshCw } from "lucide-react";
import { rosterService } from "@/lib/services/coach";
import { useCoachStore } from "@/stores/coach.store";
import type { RosterAthlete } from "@/lib/types/coach";
import { getAthleteStatus } from "@/lib/types/coach";
import { AthleteCard } from "./AthleteCard";

type StatusFilter = "all" | "fresh" | "optimal" | "fatigued";

const FILTER_TABS: { id: StatusFilter; label: string; color?: string }[] = [
  { id: "all", label: "All" },
  { id: "fresh", label: "Fresh", color: "#22c55e" },
  { id: "optimal", label: "Optimal", color: "#f59e0b" },
  { id: "fatigued", label: "Fatigued", color: "#ef4444" },
];

export function RosterPanel() {
  const { selectedAthleteId, setSelectedAthlete, openInviteModal } = useCoachStore();
  const [athletes, setAthletes] = useState<RosterAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rosterService.list({ size: 50 });
      setAthletes(res.content);
    } catch {
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter athletes
  const filtered = athletes
    .filter((a) => {
      if (statusFilter !== "all") {
        const s = getAthleteStatus(a.fitness?.tsb);
        if (s !== statusFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (a.nickname ?? a.name).toLowerCase();
        const tags = a.tags.join(" ").toLowerCase();
        if (!name.includes(q) && !tags.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort pending invites to bottom
      if (a.status === "pending" && b.status !== "pending") return 1;
      if (b.status === "pending" && a.status !== "pending") return -1;
      return 0;
    });

  const pendingCount = athletes.filter((a) => a.status === "pending").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "var(--space-5) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "var(--color-accent)" }} />
            <h2
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Roster
            </h2>
            {athletes.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-full)",
                  padding: "1px 7px",
                }}
              >
                {athletes.filter((a) => a.status === "active").length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={load}
              title="Refresh roster"
              style={{
                width: 30, height: 30,
                borderRadius: "var(--radius-sm)",
                border: "1px solid transparent",
                background: "transparent",
                color: "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                transition: "all var(--duration-micro)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-elevated)";
                e.currentTarget.style.borderColor = "var(--border-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={openInviteModal}
              id="invite-athlete-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity var(--duration-micro)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              <UserPlus size={12} />
              <span>Invite</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            padding: "0 var(--space-3)",
            height: 36,
          }}
        >
          <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            id="roster-search"
            type="text"
            placeholder="Search athletes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 mt-3">
          {FILTER_TABS.map(({ id, label, color }) => {
            const isActive = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-full)",
                  border: isActive
                    ? `1px solid ${color ?? "var(--color-accent)"}44`
                    : "1px solid var(--border-subtle)",
                  background: isActive
                    ? (color ? `${color}14` : "var(--color-accent-8)")
                    : "transparent",
                  color: isActive
                    ? (color ?? "var(--color-accent)")
                    : "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all var(--duration-micro)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {color && id !== "all" && (
                  <span
                    style={{
                      width: 5, height: 5,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 4px ${color}`,
                    }}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pending invites notice ──────────────────────────────── */}
      {pendingCount > 0 && (
        <div
          style={{
            margin: "var(--space-3) var(--space-4) 0",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            fontSize: "var(--text-xs)",
            color: "var(--color-warning)",
            flexShrink: 0,
          }}
        >
          ⏳ {pendingCount} pending invite{pendingCount > 1 ? "s" : ""} awaiting acceptance
        </div>
      )}

      {/* ── Athlete list ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-3) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 70,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
                backgroundSize: "400px 100%",
                animation: "skeleton-shimmer 1.6s ease-in-out infinite",
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-12) var(--space-4)",
              color: "var(--text-muted)",
            }}
          >
            <Users size={32} style={{ marginBottom: "var(--space-3)", opacity: 0.3 }} />
            <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>
              {athletes.length === 0
                ? "No athletes yet. Invite your first athlete!"
                : "No athletes match the filter."}
            </p>
          </div>
        ) : (
          filtered.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              isSelected={selectedAthleteId === athlete.id}
              onClick={() => setSelectedAthlete(athlete.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
