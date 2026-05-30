"use client";

/**
 * SyncStatusWidget — shows last-sync timestamp and a manual trigger button
 * for each connected provider.
 *
 * API:
 *   GET  /sync/status            → SyncStatusResponse
 *   POST /sync/trigger/{provider} → { queued: true }
 *
 * Only renders for providers that appear in the connections list.
 * Shown inside ConnectionsSection below the provider cards.
 */

import React, { useState, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import type { SyncStatusResponse, ProviderSyncStatus, SyncState } from "@/lib/types/sync";
import type { ConnectionProvider } from "@/lib/types/settings";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const STATE_COLOR: Record<SyncState, string> = {
  idle: "var(--text-muted)",
  syncing: "var(--color-accent)",
  success: "var(--color-success)",
  error: "var(--color-danger)",
};

const PROVIDER_LABELS: Record<string, string> = {
  strava: "Strava",
  garmin: "Garmin Connect",
};

/* ─── ProviderSyncRow ─────────────────────────────────────────────────────── */

function ProviderSyncRow({
  status,
  onTrigger,
  triggering,
}: {
  status: ProviderSyncStatus;
  onTrigger: (provider: string) => void;
  triggering: boolean;
}) {
  const { provider, state, lastSyncAt, lastError, activitiesSynced } = status;
  const color = STATE_COLOR[state];
  const isSyncing = state === "syncing" || triggering;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* State icon */}
      <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center" }}>
        {isSyncing ? (
          <Loader2
            size={16}
            style={{ color: "var(--color-accent)", animation: "spin 1s linear infinite" }}
            aria-label="Syncing"
          />
        ) : state === "success" ? (
          <CheckCircle size={16} style={{ color }} aria-label="Last sync succeeded" />
        ) : state === "error" ? (
          <AlertCircle size={16} style={{ color }} aria-label="Last sync failed" />
        ) : (
          <Clock size={16} style={{ color }} aria-label="Sync idle" />
        )}
      </div>

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {PROVIDER_LABELS[provider] ?? provider}
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          {isSyncing
            ? "Syncing…"
            : lastError
              ? lastError
              : lastSyncAt
                ? `Last synced ${formatRelativeTime(lastSyncAt)}${
                    activitiesSynced != null ? ` · ${activitiesSynced} activities` : ""
                  }`
                : "Never synced"}
        </p>
      </div>

      {/* Trigger button */}
      <Button
        id={`sync-trigger-${provider}`}
        variant="ghost"
        size="sm"
        loading={isSyncing}
        disabled={isSyncing}
        onClick={() => onTrigger(provider)}
        aria-label={`Trigger manual sync for ${PROVIDER_LABELS[provider] ?? provider}`}
        leftIcon={<RefreshCw size={13} />}
      >
        Sync
      </Button>
    </div>
  );
}

/* ─── Main widget ─────────────────────────────────────────────────────────── */

interface SyncStatusWidgetProps {
  /** Only show rows for these providers (those actually connected) */
  connectedProviders: ConnectionProvider[];
}

export function SyncStatusWidget({ connectedProviders }: SyncStatusWidgetProps) {
  const { data, loading, refetch } = useQuery<SyncStatusResponse>("/sync/status");
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const handleTrigger = useCallback(
    async (provider: string) => {
      setTriggering((prev) => ({ ...prev, [provider]: true }));
      try {
        await api.post(`/sync/trigger/${provider}`);
        // Optimistically mark as syncing; poll will update
        setTimeout(() => {
          refetch();
          setTriggering((prev) => ({ ...prev, [provider]: false }));
        }, 3000);
      } catch {
        setTriggering((prev) => ({ ...prev, [provider]: false }));
        refetch();
      }
    },
    [refetch],
  );

  if (connectedProviders.length === 0) return null;

  const providers = connectedProviders.filter(
    (p) => p === "strava" || p === "garmin",
  ) as Array<"strava" | "garmin">;

  if (providers.length === 0) return null;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {providers.map((p) => (
          <Skeleton key={p} height="52px" />
        ))}
      </div>
    );
  }

  const rows = providers
    .map((provider) => {
      const found = data?.providers.find((s) => s.provider === provider);
      if (!found) {
        // Default for providers with no sync history yet
        const fallback: ProviderSyncStatus = {
          provider,
          state: "idle",
          lastSyncAt: null,
          lastError: null,
          activitiesSynced: null,
        };
        return fallback;
      }
      return found;
    });

  return (
    <div>
      <p
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        Sync Status
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((status) => (
          <ProviderSyncRow
            key={status.provider}
            status={status}
            onTrigger={handleTrigger}
            triggering={triggering[status.provider] ?? false}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
