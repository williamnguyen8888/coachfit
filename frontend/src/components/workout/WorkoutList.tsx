"use client";

/**
 * WorkoutList — paginated workout list with all states:
 *   loading  → skeleton rows
 *   error    → error panel with retry
 *   empty    → friendly empty state with create CTA
 *   data     → list of WorkoutCard + Pagination
 *
 * viewMode prop kept for API compat but ignored (list-only).
 */

import * as React from "react";
import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkoutCard } from "./WorkoutCard";
import type { WorkoutsFilter, PaginatedWorkouts, WorkoutSummary } from "@/lib/types/workout";
import { useQuery } from "@/hooks/useQuery";

/* ------------------------------------------------------------------ */
/*  Skeleton row                                                         */
/* ------------------------------------------------------------------ */

function WorkoutCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 64,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "3px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        gap: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {/* Icon area */}
      <div
        style={{
          width: 52,
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Skeleton width={20} height={20} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton width="42%" height={15} />
        <Skeleton width="18%" height={11} />
      </div>

      {/* Right area */}
      <div style={{ padding: "0 14px 0 12px", flexShrink: 0 }}>
        <Skeleton width={52} height={20} />
      </div>
    </div>
  );
}

function LoadingState({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading workouts" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <WorkoutCardSkeleton key={i} />
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
  onCreateNew: () => void;
}

function EmptyState({ hasFilters, onReset, onCreateNew }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-20 gap-5"
      role="status"
      aria-label="No workouts found"
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
          fontSize: 32,
        }}
        aria-hidden="true"
      >
        💪
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
          {hasFilters ? "No workouts match your filters" : "No workouts yet"}
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
            : "Create your first structured workout or browse system templates to get started."}
        </p>
      </div>

      {hasFilters ? (
        <Button variant="secondary" size="md" onClick={onReset}>
          Clear Filters
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            id="create-workout-btn-empty"
            variant="primary"
            size="md"
            leftIcon={<Plus size={15} />}
            onClick={onCreateNew}
          >
            Create Workout
          </Button>
          <Button variant="secondary" size="md" onClick={() => {}}>
            Browse Templates
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                          */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
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
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Failed to load workouts
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 360 }}>
          {message}
        </p>
      </div>

      <Button variant="secondary" size="md" onClick={onRetry} leftIcon={<RefreshCw size={14} />}>
        Retry
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                           */
/* ------------------------------------------------------------------ */

function Pagination({
  page,
  totalPages,
  onPageChange,
  totalElements,
  pageSize = 20,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalElements?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements ?? (page + 1) * pageSize);

  return (
    <nav aria-label="Workout list pagination" className="flex flex-col items-center gap-3 py-6">
      {totalElements !== undefined && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }} aria-live="polite">
          Showing {startItem}–{endItem} of {totalElements.toLocaleString()}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          ← Prev
        </Button>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Page {page + 1} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
        >
          Next →
        </Button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkoutList                                                          */
/* ------------------------------------------------------------------ */

export interface WorkoutListProps {
  filter: WorkoutsFilter;
  /** Kept for API compat — ignored (list-only) */
  viewMode?: "grid" | "list";
  onPageChange: (page: number) => void;
  onReset: () => void;
  onTotalChange?: (total: number) => void;
  onWorkoutsLoaded?: (workouts: WorkoutSummary[]) => void;
  onCreateNew: () => void;
}

export function WorkoutList({
  filter,
  onPageChange,
  onReset,
  onTotalChange,
  onWorkoutsLoaded,
  onCreateNew,
}: WorkoutListProps) {
  const router = useRouter();

  const handleCardClick = useCallback(
    (id: string) => {
      router.push(`/workouts/${id}`);
    },
    [router]
  );

  // Build query path from filter
  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(filter.page ?? 0));
    params.set("size", String(filter.size ?? 20));
    params.set("sort", filter.sort ?? "createdAt,desc");
    if (filter.sport) params.set("sport", filter.sport);
    return `/workouts?${params.toString()}`;
  }, [filter]);

  const { data, loading, error, errorMessage, refetch } =
    useQuery<PaginatedWorkouts>(queryPath);

  // Notify parent of total count for filter bar badge
  const prevTotal = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (data?.totalElements !== undefined && data.totalElements !== prevTotal.current) {
      prevTotal.current = data.totalElements;
      onTotalChange?.(data.totalElements);
    }
  }, [data?.totalElements, onTotalChange]);

  // Compute final workouts list (including client side source filtering)
  const workouts = useMemo(() => {
    let list = data?.content ?? [];
    if (filter.source === "template") {
      list = list.filter((w) => w.isTemplate);
    } else if (filter.source === "mine") {
      list = list.filter((w) => !w.isTemplate);
    }
    return list;
  }, [data?.content, filter.source]);

  // Pass active workouts back to parent for summary stats calculations
  React.useEffect(() => {
    onWorkoutsLoaded?.(workouts);
  }, [workouts, onWorkoutsLoaded]);

  const hasFilters = !!(filter.sport || (filter.source && filter.source !== "all"));

  /* ── Loading ── */
  if (loading && !data) {
    return <LoadingState count={8} />;
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

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const currentPage = data?.page ?? (filter.page ?? 0);

  return (
    <div>
      {/* Re-fetch indicator */}
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

      {/* Stale error banner */}
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
      {workouts.length === 0 && !loading ? (
        <EmptyState hasFilters={hasFilters} onReset={onReset} onCreateNew={onCreateNew} />
      ) : (
        <>
          <ol
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
            aria-label="Workouts"
            aria-live="polite"
          >
            {workouts.map((workout) => (
              <li key={workout.id}>
                <WorkoutCard
                  workout={workout}
                  onClick={handleCardClick}
                />
              </li>
            ))}
          </ol>

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
