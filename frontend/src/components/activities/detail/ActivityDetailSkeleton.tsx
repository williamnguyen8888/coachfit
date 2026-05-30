"use client";

/**
 * ActivityDetailSkeleton — shimmer placeholder while detail data loads.
 */

import * as React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

function SectionSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={18} />
      <Skeleton width="100%" height={height} />
    </div>
  );
}

export function ActivityDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-label="Loading activity…" aria-busy="true">
      {/* Hero header */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Skeleton shape="circle" width={48} height={48} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width="60%" height={22} />
            <Skeleton width="35%" height={14} />
          </div>
          <Skeleton width={80} height={28} />
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width={48} height={11} />
              <Skeleton width={72} height={26} />
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <SectionSkeleton height={280} />

      {/* Charts */}
      <SectionSkeleton height={200} />

      {/* Laps + Metrics side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionSkeleton height={220} />
        <SectionSkeleton height={220} />
      </div>
    </div>
  );
}
