"use client";

/**
 * Activities List Page — /activities
 *
 * Features:
 *  - Premium Hero summary dashboard (aggregated stats)
 *  - Sticky frosted-glass filter bar (sport, source, date range, view toggle)
 *  - Grid and List layouts with responsive behavior
 *  - Loading skeleton, empty, and error states
 *  - Upload button in page header
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityList } from "@/components/activities/ActivityList";
import { UploadModal } from "@/components/activities/UploadModal";
import { ActivitiesSummaryDashboard } from "@/components/activities/ActivitiesSummaryDashboard";
import type { ActivitiesFilter, ActivitySummary } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Default filter state                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_FILTER: ActivitiesFilter = {
  page: 0,
  size: 20,
  sort: "startedAt,desc",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                 */
/* ------------------------------------------------------------------ */

export default function ActivitiesPage() {
  const [filter, setFilter] = useState<ActivitiesFilter>(DEFAULT_FILTER);
  const [totalElements, setTotalElements] = useState<number | undefined>(
    undefined
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [loadedActivities, setLoadedActivities] = useState<ActivitySummary[]>([]);

  /* ── Filter management ── */
  const handleFilterChange = useCallback(
    (patch: Partial<ActivitiesFilter>) => {
      setFilter((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page }));
    // Scroll to top of list on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [showUpload, setShowUpload] = useState(false);

  /* ── Upload handler ── */
  const handleUpload = useCallback(() => {
    setShowUpload(true);
  }, []);

  const handleUploadSuccess = useCallback(
    () => {
      setShowUpload(false);
      // Refetch list after a short delay (processing lag)
      setTimeout(() => {
        setFilter({ ...DEFAULT_FILTER });
      }, 1500);
    },
    [],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Page header ── */}
      <PageHeader
        title="Activities"
        subtitle="Your training history from all connected sources"
        action={
          <Button
            id="upload-activity-btn"
            variant="primary"
            size="md"
            leftIcon={<Upload size={15} />}
            onClick={handleUpload}
            aria-label="Upload a FIT, TCX, or GPX activity file"
          >
            Upload
          </Button>
        }
      />

      {/* ── Summary statistics dashboard ── */}
      <ActivitiesSummaryDashboard 
        activities={loadedActivities} 
        loading={totalElements === undefined} 
      />

      {/* ── Sticky filter bar ── */}
      <ActivityFilters
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        totalElements={totalElements}
        loading={totalElements === undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* ── Activities list ── */}
      <main
        id="activities-list"
        className="flex-1 px-4 lg:px-6 py-5"
        aria-label="Activities list"
      >
        <ActivityList
          filter={filter}
          viewMode={viewMode}
          onPageChange={handlePageChange}
          onReset={handleReset}
          onTotalChange={setTotalElements}
          onActivitiesLoaded={setLoadedActivities}
        />
      </main>

      {/* ── Upload modal ── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
