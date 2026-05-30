"use client";

/**
 * ActivitySourceInfo — shows where this activity came from.
 *
 * Displays: source badge + description, date, file format, activity ID,
 * and a download link for the original file.
 */

import * as React from "react";
import { Download, ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "../SourceBadge";
import type { ActivityDetail } from "@/lib/types/activity";

const SOURCE_DESC: Record<string, string> = {
  strava:  "Synced automatically via Strava webhook.",
  garmin:  "Pushed from Garmin Connect via the Garmin Health API.",
  manual:  "Created manually by you or your coach.",
  upload:  "Uploaded directly as a FIT/TCX/GPX file.",
};

interface ActivitySourceInfoProps {
  activity: ActivityDetail;
}

export function ActivitySourceInfo({ activity }: ActivitySourceInfoProps) {
  const { id, source, startedAt, rawFileFormat } = activity;
  const description = SOURCE_DESC[source] ?? SOURCE_DESC.manual;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "var(--space-4)",
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Info size={15} style={{ color: "var(--color-accent)" }} />
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Source Information
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Source badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SourceBadge source={source} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {description}
          </span>
        </div>

        {/* Date */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Activity Date</span>
          <span className="tabular-nums" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            {new Date(startedAt).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* File format */}
        {rawFileFormat && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>File Format</span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: "var(--color-fitness)",
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                letterSpacing: "0.04em",
              }}
            >
              .{rawFileFormat.toUpperCase()}
            </span>
          </div>
        )}

        {/* Activity ID */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Activity ID</span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {id.slice(0, 8)}…
          </span>
        </div>

        {/* Download */}
        {rawFileFormat && (
          <a
            href={`/api/v1/activities/${id}/download`}
            download
            aria-label={`Download original ${rawFileFormat.toUpperCase()} file`}
            style={{
              marginTop: "var(--space-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              textDecoration: "none",
              transition: "all var(--duration-micro) ease-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Download size={14} />
            Download Original File
            <ExternalLink size={12} style={{ opacity: 0.5 }} />
          </a>
        )}
      </div>
    </Card>
  );
}
