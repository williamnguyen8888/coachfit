"use client";

/**
 * ActivityList — activities list with date grouping, states, and pagination.
 *
 * Groups activities by calendar date with headers:
 *   "Today" | "Yesterday" | "Mon 3 Jun"
 *
 * States: loading (skeleton) · error · empty · data
 * viewMode prop is accepted for backwards compat but always renders list.
 */

import * as React from "react";
import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Dumbbell, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityCard } from "./ActivityCard";
import { Pagination } from "./Pagination";
import { useQuery } from "@/hooks/useQuery";
import type {
  ActivitiesFilter,
  PaginatedActivities,
  ActivitySummary,
} from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Date grouping helpers                                                */
/* ------------------------------------------------------------------ */

function toDateKey(iso: string): string {
  // Return YYYY-MM-DD in local time
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatGroupHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const now = new Date();
  const todayKey = toDateKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yestKey = toDateKey(yesterday.toISOString());

  if (dateKey === todayKey) return "Today";
  if (dateKey === yestKey) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface DateGroup {
  key: string;           // YYYY-MM-DD
  label: string;         // "Today" | "Yesterday" | "Mon 3 Jun"
  activities: ActivitySummary[];
}

function groupByDate(activities: ActivitySummary[]): DateGroup[] {
  const map = new Map<string, ActivitySummary[]>();
  for (const a of activities) {
    const key = toDateKey(a.startedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries()).map(([key, acts]) => ({
    key,
    label: formatGroupHeader(key),
    activities: acts,
  }));
}

/* ------------------------------------------------------------------ */
/*  Date group header                                                    */
/* ------------------------------------------------------------------ */

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
        marginTop: 4,
      }}
      aria-label={`Activities on ${label}`}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background: "var(--border-subtle)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loading state                                               */
/* ------------------------------------------------------------------ */

function ActivityCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 68,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "3px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        paddingRight: 16,
      }}
      aria-hidden="true"
    >
      {/* Icon area */}
      <div
        style={{
          width: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Skeleton width={24} height={24} />
      </div>
      {/* Middle */}
      <div style={{ flex: 1, minWidth: 0, padding: "12px 0" }}>
        <Skeleton width="45%" height={15} />
        <div style={{ marginTop: 6 }}>
          <Skeleton width="28%" height={11} />
        </div>
      </div>
      {/* Right */}
      <div style={{ flexShrink: 0, textAlign: "right", paddingLeft: 12 }}>
        <Skeleton width={64} height={20} />
        <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <Skeleton width={36} height={11} />
          <Skeleton width={36} height={11} />
        </div>
      </div>
    </div>
  );
}

function SkeletonGroup() {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Fake date header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
        aria-hidden="true"
      >
        <Skeleton width={60} height={11} />
        <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <ActivityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function LoadingState({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading activities">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGroup key={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                          */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  hasFilters: boolean;
  onReset: () => void;
}

function EmptyState({ hasFilters, onReset }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-20 gap-5"
      role="status"
      aria-label="No activities found"
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        <Dumbbell size={32} style={{ color: "var(--text-muted)" }} />
      </div>

      <div>
        <h3
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          {hasFilters ? "No activities match your filters" : "No activities yet"}
        </h3>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            maxWidth: 380,
          }}
        >
          {hasFilters
            ? "Try adjusting or clearing your filters to see more results."
            : "Connect Strava or Garmin, or upload a FIT/TCX/GPX file to get started."}
        </p>
      </div>

      {hasFilters ? (
        <Button variant="secondary" size="md" onClick={onReset}>
          Clear Filters
        </Button>
      ) : (
        <Button variant="primary" size="md" leftIcon={<Upload size={15} />}>
          Upload Activity
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                          */
/* ------------------------------------------------------------------ */

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 gap-4"
      role="alert"
      aria-live="assertive"
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-danger-10)",
          border: "1px solid var(--color-danger-20)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        <AlertCircle size={24} style={{ color: "var(--color-danger)" }} />
      </div>

      <div>
        <h3
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Failed to load activities
        </h3>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            maxWidth: 360,
          }}
        >
          {message}
        </p>
      </div>

      <Button
        variant="secondary"
        size="md"
        onClick={onRetry}
        leftIcon={<RefreshCw size={14} />}
      >
        Retry
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                       */
/* ------------------------------------------------------------------ */

export interface ActivityListProps {
  filter: ActivitiesFilter;
  /** Accepted for backwards compat — always renders list */
  viewMode?: "grid" | "list";
  onPageChange: (page: number) => void;
  onReset: () => void;
  onTotalChange?: (total: number) => void;
  onActivitiesLoaded?: (activities: ActivitySummary[]) => void;
}

export function ActivityList({
  filter,
  onPageChange,
  onReset,
  onTotalChange,
  onActivitiesLoaded,
}: ActivityListProps) {
  const router = useRouter();

  const handleCardClick = useCallback(
    (id: string) => {
      router.push(`/activities/${id}`);
    },
    [router]
  );

  // Build query string from filter — changes trigger refetch
  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    const page = filter.page ?? 0;
    const size = filter.size ?? 20;
    params.set("page", String(page));
    params.set("size", String(size));
    params.set("sort", filter.sort ?? "startedAt,desc");
    if (filter.sport)  params.set("sport",  filter.sport);
    if (filter.source) params.set("source", filter.source);
    if (filter.from)   params.set("from",   filter.from);
    if (filter.to)     params.set("to",     filter.to);
    return `/activities?${params.toString()}`;
  }, [filter]);

  const { data, loading, error, errorMessage, refetch } =
    useQuery<PaginatedActivities>(queryPath);

  // Notify parent of total elements for the filter bar counter
  const prevTotal = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (
      data?.totalElements !== undefined &&
      data.totalElements !== prevTotal.current
    ) {
      prevTotal.current = data.totalElements;
      onTotalChange?.(data.totalElements);
    }
  }, [data?.totalElements, onTotalChange]);

  // Pass loaded activities up to parent
  React.useEffect(() => {
    if (data?.content) {
      onActivitiesLoaded?.(data.content);
    } else if (!loading && !data) {
      onActivitiesLoaded?.([]);
    }
  }, [data, loading, onActivitiesLoaded]);

  const hasFilters = !!(filter.sport || filter.source || filter.from || filter.to);

  /* ── Loading ── */
  if (loading && !data) {
    return <LoadingState count={3} />;
  }

  /* ── Error ── */
  if (error && !data) {
    return (
      <ErrorState
        message={errorMessage ?? "An unexpected error occurred. Please try again."}
        onRetry={refetch}
      />
    );
  }

  /* ── Data ── */
  const activities   = data?.content    ?? [];
  const totalPages   = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const currentPage  = data?.page ?? (filter.page ?? 0);
  const groups       = groupByDate(activities);

  return (
    <div>
      {/* Re-fetch indicator (stale data shown, new request in flight) */}
      {loading && data && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "6px 0",
            textAlign: "center",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          Updating…
        </div>
      )}

      {/* Error banner while stale data is shown */}
      {error && data && (
        <div
          role="alert"
          style={{
            background: "var(--color-danger-8)",
            border: "1px solid var(--color-danger-20)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
            Refresh failed. Showing previous results.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            leftIcon={<RefreshCw size={12} />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {activities.length === 0 && !loading ? (
        <EmptyState hasFilters={hasFilters} onReset={onReset} />
      ) : (
        <>
          {/* Date-grouped activity list */}
          <div aria-label="Activities" aria-live="polite" aria-atomic="false">
            {groups.map((group) => (
              <section key={group.key} style={{ marginBottom: 20 }}>
                <DateGroupHeader label={group.label} />
                <ol style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {group.activities.map((activity) => (
                    <li key={activity.id}>
                      <ActivityCard
                        activity={activity}
                        onClick={handleCardClick}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalElements={totalElements}
            pageSize={filter.size ?? 20}
          />
        </>
      )}
    </div>
  );
}
