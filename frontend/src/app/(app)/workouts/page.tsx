"use client";

/**
 * Workout Library Page — /workouts
 *
 * Features:
 *  - Sticky filter bar (source: all/mine/templates, sport, sort)
 *  - Paginated workout cards
 *  - Loading skeleton, empty, and error states
 *  - "Create Workout" CTA (wires to /workouts/new — builder in future ticket)
 *  - Template vs user-created badge on each card
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { WorkoutFilters } from "@/components/workout/WorkoutFilters";
import { WorkoutList } from "@/components/workout/WorkoutList";
import type { WorkoutsFilter } from "@/lib/types/workout";

/* ------------------------------------------------------------------ */
/*  Default filter                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_FILTER: WorkoutsFilter = {
  page: 0,
  size: 20,
  sort: "createdAt,desc",
  source: "all",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                 */
/* ------------------------------------------------------------------ */

export default function WorkoutsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<WorkoutsFilter>(DEFAULT_FILTER);
  const [totalElements, setTotalElements] = useState<number | undefined>(undefined);

  /* ── Filter management ── */
  const handleFilterChange = useCallback((patch: Partial<WorkoutsFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── Create handler ── */
  const handleCreate = useCallback(() => {
    // TODO: navigate to workout builder when F09 is built
    router.push("/workouts/new");
  }, [router]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Page header ── */}
      <PageHeader
        title="Workout Library"
        subtitle="Structured workouts and system templates"
        action={
          <Button
            id="create-workout-btn"
            variant="primary"
            size="md"
            leftIcon={<Plus size={15} />}
            onClick={handleCreate}
            aria-label="Create a new structured workout"
          >
            Create Workout
          </Button>
        }
      />

      {/* ── Sticky filter bar ── */}
      <WorkoutFilters
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        totalElements={totalElements}
        loading={totalElements === undefined}
      />

      {/* ── Workout list ── */}
      <main
        id="workouts-list"
        className="flex-1 px-4 lg:px-6 py-5"
        aria-label="Workout library"
      >
        <WorkoutList
          filter={filter}
          onPageChange={handlePageChange}
          onReset={handleReset}
          onTotalChange={setTotalElements}
          onCreateNew={handleCreate}
        />
      </main>
    </div>
  );
}
