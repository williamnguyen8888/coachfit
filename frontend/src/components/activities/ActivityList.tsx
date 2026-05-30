"use client";

/**
 * ActivityList — the full activities list with states:
 *   loading  → skeleton cards
 *   error    → error panel with retry button
 *   empty    → friendly empty state
 *   data     → grid of ActivityCard
 *
 * Uses the useQuery hook + activitiesService.
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
import type { ActivitiesFilter, PaginatedActivities } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Skeleton loading state                                               */
/* ------------------------------------------------------------------ */

function ActivityCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "3px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      aria-hidden="true"
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton width={40} height={40} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="35%" height={11} />
        </div>
        <Skeleton width={56} height={20} />
      </div>
      {/* Metrics row */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 12,
          display: "flex",
          gap: 24,
        }}
      >
        <Skeleton width={64} height={14} />
        <Skeleton width={60} height={14} />
        <Skeleton width={68} height={14} />
      </div>
    </div>
  );
}

function LoadingState({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading activities"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ActivityCardSkeleton key={i} />
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
        <Button
          variant="primary"
          size="md"
          leftIcon={<Upload size={15} />}
        >
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
  onPageChange: (page: number) => void;
  onReset: () => void;
  onTotalChange?: (total: number) => void;
}

export function ActivityList({
  filter,
  onPageChange,
  onReset,
  onTotalChange,
}: ActivityListProps) {
  const router = useRouter();

  const handleCardClick = useCallback((id: string) => {
    router.push(`/activities/${id}`);
  }, [router]);

  // Build query string from filter — changes trigger refetch
  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    const page = filter.page ?? 0;
    const size = filter.size ?? 20;
    params.set("page", String(page));
    params.set("size", String(size));
    params.set("sort", filter.sort ?? "startedAt,desc");
    if (filter.sport) params.set("sport", filter.sport);
    if (filter.source) params.set("source", filter.source);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    return `/activities?${params.toString()}`;
  }, [filter]);

  const { data, loading, error, errorMessage, refetch } =
    useQuery<PaginatedActivities>(queryPath);

  // Notify parent of total elements for the filter bar counter
  const prevTotal = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (data?.totalElements !== undefined && data.totalElements !== prevTotal.current) {
      prevTotal.current = data.totalElements;
      onTotalChange?.(data.totalElements);
    }
  }, [data?.totalElements, onTotalChange]);

  const hasFilters = !!(
    filter.sport ||
    filter.source ||
    filter.from ||
    filter.to
  );

  /* ── Loading ── */
  if (loading && !data) {
    return <LoadingState count={6} />;
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
  const activities = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const currentPage = data?.page ?? (filter.page ?? 0);

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
          <Button variant="ghost" size="sm" onClick={refetch} leftIcon={<RefreshCw size={12} />}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {activities.length === 0 && !loading ? (
        <EmptyState hasFilters={hasFilters} onReset={onReset} />
      ) : (
        <>
          {/* Activity list */}
          <ol
            className="flex flex-col gap-3"
            aria-label="Activities"
            aria-live="polite"
            aria-atomic="false"
          >
            {activities.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} onClick={handleCardClick} />
              </li>
            ))}
          </ol>

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
