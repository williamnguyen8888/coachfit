"use client";
// src/components/settings/ConnectionsSection.tsx
// Connected accounts — Strava, Garmin connect/disconnect UI.
// Leaves room for Google identity display when that provider is exposed.
// API: GET /athlete/connections · DELETE /athlete/connections/{provider}
//      Initiate connect: navigate to /auth/oauth/{provider}

import React, { useState } from "react";
import { useQuery } from "@/hooks/useQuery";
import { connectionsService } from "@/lib/services/settings";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SyncStatusWidget } from "./SyncStatusWidget";
import { CheckCircle, ExternalLink, Link2, Link2Off, RefreshCw } from "lucide-react";
import type { ConnectedAccount, ConnectionProvider, ConnectionsResponse } from "@/lib/types/settings";

/* ─── Provider config ────────────────────────────────────────────────────── */

interface ProviderConfig {
  provider: ConnectionProvider;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean; // false = not yet backend-surfaced, show placeholder
}

// Strava orange: #FC4C02   Garmin teal: #009CDE  Google: #4285F4
function StravaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" fill="#FC4C02"/>
    </svg>
  );
}

function GarminIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 22H22L12 2Z" fill="#009CDE" />
      <path d="M12 8L6 20H18L12 8Z" fill="var(--bg-surface)" />
      <circle cx="12" cy="15" r="2.5" fill="#009CDE" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: "strava",
    label: "Strava",
    description: "Import activities, routes, and training load automatically.",
    icon: <StravaIcon />,
    color: "#FC4C02",
    available: true,
  },
  {
    provider: "garmin",
    label: "Garmin Connect",
    description: "Sync health metrics, HRV, sleep, and daily data. Push planned workouts directly to your Garmin device.",
    icon: <GarminIcon />,
    color: "#009CDE",
    available: true,
  },
  {
    provider: "google",
    label: "Google",
    description: "Your linked Google account for sign-in.",
    icon: <GoogleIcon />,
    color: "#4285F4",
    available: false, // Backend OAuth surface pending
  },
];

/* ─── Connection card ─────────────────────────────────────────────────────── */

function ConnectionCard({
  config,
  connection,
  onConnect,
  onDisconnect,
}: {
  config: ProviderConfig;
  connection: ConnectedAccount | null;
  onConnect: (provider: ConnectionProvider) => void;
  onDisconnect: (provider: ConnectionProvider) => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = Boolean(connection);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(config.provider);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div
      className="flex items-start gap-4 rounded-[var(--radius-lg)] p-5 transition-all duration-150"
      style={{
        background: isConnected
          ? "var(--bg-elevated)"
          : "rgba(255, 255, 255, 0.01)",
        border: isConnected
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid var(--border-subtle)",
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-[var(--radius-md)] shrink-0 shadow-sm"
        style={{
          width: 44,
          height: 44,
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {config.icon}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {config.label}
          </span>
          {isConnected && (
            <span
              className="flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--color-success)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <CheckCircle size={10} />
              Connected
            </span>
          )}
          {!config.available && (
            <span
              className="rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Coming soon
            </span>
          )}
        </div>

        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {config.description}
        </p>

        {connection?.athleteName && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>
            Connected as <strong style={{ color: "var(--text-secondary)" }}>{connection.athleteName}</strong>
            {connection.connectedAt && (
              <> · since {new Date(connection.connectedAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</>
            )}
          </p>
        )}
      </div>

      {/* Action */}
      <div className="shrink-0 self-center ml-2">
        {config.available ? (
          isConnected ? (
            <Button
              id={`disconnect-${config.provider}`}
              variant="ghost"
              size="sm"
              loading={disconnecting}
              leftIcon={<Link2Off size={13} />}
              onClick={handleDisconnect}
              className="hover:bg-[rgba(239,68,68,0.06)] hover:text-[var(--color-danger)] border border-[rgba(239,68,68,0.15)]"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              id={`connect-${config.provider}`}
              variant="secondary"
              size="sm"
              leftIcon={<Link2 size={13} />}
              rightIcon={<ExternalLink size={11} />}
              onClick={() => onConnect(config.provider)}
              className="bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] text-[var(--text-primary)]"
            >
              Connect
            </Button>
          )
        ) : (
          <Button variant="ghost" size="sm" disabled>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────────────────────────── */

export function ConnectionsSection() {
  const { data, loading, refetch } = useQuery<ConnectionsResponse>("/athlete/connections");
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const handleConnect = (provider: ConnectionProvider) => {
    // Navigate to backend OAuth initiation URL.
    // After OAuth completes, backend redirects back and records the connection.
    window.location.href = connectionsService.getConnectUrl(
      provider as "strava" | "garmin" | "google",
    );
  };

  const handleDisconnect = async (provider: ConnectionProvider) => {
    setDisconnectError(null);
    try {
      await connectionsService.disconnect(provider);
      refetch();
    } catch (e) {
      setDisconnectError(
        e instanceof Error ? e.message : "Failed to disconnect",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="88px" />
        ))}
      </div>
    );
  }

  const connections = data ?? [];

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {/* Info banner */}
      <div
        className="flex items-start gap-2 rounded-[var(--radius-md)] px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--color-info) 8%, var(--bg-elevated))",
          border: "1px solid color-mix(in srgb, var(--color-info) 20%, var(--border-subtle))",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
        }}
      >
        <RefreshCw size={14} style={{ color: "var(--color-info)", marginTop: 2, flexShrink: 0 }} />
        <span>
          Connected platforms sync automatically. Activities, health metrics, and sleep data are imported in real time via webhooks.
        </span>
      </div>

      {/* Provider cards */}
      <div className="flex flex-col gap-3">
        {PROVIDER_CONFIGS.map((config) => {
          const conn = connections.find((c) => c.provider === config.provider) ?? null;
          return (
            <ConnectionCard
              key={config.provider}
              config={config}
              connection={conn}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          );
        })}
      </div>

      {/* Sync status for connected providers */}
      {connections.length > 0 && (
        <SyncStatusWidget
          connectedProviders={connections.map((c) => c.provider)}
        />
      )}

      {/* Error */}
      {disconnectError && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
          {disconnectError}
        </p>
      )}
    </div>
  );
}
