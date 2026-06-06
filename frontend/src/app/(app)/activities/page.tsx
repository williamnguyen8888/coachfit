"use client";

/**
 * Activities List Page — /activities
 *
 * Structure: PageHeader → ActivityFilters (sticky) → main > ActivityList
 * Upload flow preserved via UploadModal.
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityList } from "@/components/activities/ActivityList";
import { UploadModal } from "@/components/activities/UploadModal";
import type { ActivitiesFilter } from "@/lib/types/activity";

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
  const router = useRouter();
  const [filter, setFilter]               = useState<ActivitiesFilter>(DEFAULT_FILTER);
  const [totalElements, setTotalElements] = useState<number | undefined>(undefined);
  const [showUpload, setShowUpload]       = useState(false);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── Upload flow ── */
  const handleUpload = useCallback(() => {
    setShowUpload(true);
  }, []);

  const handleUploadSuccess = useCallback(
    (activityId: string) => {
      setShowUpload(false);
      router.push(`/activities/${activityId}`);
    },
    [router]
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

      {/* ── Sticky filter bar ── */}
      <ActivityFilters
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        totalElements={totalElements}
        loading={totalElements === undefined}
      />

      {/* ── Activities list ── */}
      <main
        id="activities-list"
        className="flex-1 px-4 lg:px-6 py-5"
        aria-label="Activities list"
      >
        <ActivityList
          filter={filter}
          onPageChange={handlePageChange}
          onReset={handleReset}
          onTotalChange={setTotalElements}
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
