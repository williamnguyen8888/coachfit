"use client";

/**
 * Workout Detail Page — /workouts/[id]
 *
 * Layout:
 *  - Hero card: name, sport, estimated duration, tags, template badge
 *  - Description block (if present)
 *  - Structured steps list (WorkoutStepList — read-only, no builder yet)
 *  - Action bar: Edit / Delete / Assign to calendar / Export FIT (Pro)
 *
 * Data:
 *  - GET /workouts/{id}  → WorkoutDetail (steps included)
 *
 * Entry points wired:
 *  - "Back" → /workouts
 *  - "Edit"  → /workouts/{id}/edit (future ticket, stub for now)
 *  - "Delete" → DELETE /workouts/{id} via modal → redirect to /workouts
 *  - "Add to Calendar" → /calendar (future, stub)
 */

import * as React from "react";
import { use, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Edit2,
  Trash2,
  CalendarPlus,
  Download,
  RefreshCw,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkoutStepList } from "@/components/workout/WorkoutStepList";
import { WorkoutDeleteModal } from "@/components/workout/WorkoutDeleteModal";
import { workoutsService } from "@/lib/services/workouts";
import { useAsync } from "@/hooks/useAsync";
import { useQuery } from "@/hooks/useQuery";
import { formatDuration } from "@/lib/utils";
import type { WorkoutDetail } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Constants                                                            */
/* ------------------------------------------------------------------ */

const SPORT_COLOR: Record<Sport, string> = {
  cycling: "#3B82F6",
  running: "#22C55E",
  swimming: "#06B6D4",
  strength: "#F97316",
  other: "#6B7280",
};

const SPORT_EMOJI: Record<Sport, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "🏋️",
  other: "🎯",
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                             */
/* ------------------------------------------------------------------ */

function WorkoutDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      {/* Back button */}
      <Skeleton width={80} height={32} />

      {/* Hero card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        aria-hidden="true"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Skeleton width={64} height={64} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width="60%" height={22} />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Skeleton width={100} height={28} />
          <Skeleton width={80} height={28} />
        </div>
      </div>

      {/* Steps card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        aria-hidden="true"
      >
        <Skeleton width="30%" height={18} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={44} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                          */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-24 gap-5"
      role="alert"
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "var(--radius-lg)",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        <AlertCircle size={26} style={{ color: "var(--color-danger)" }} />
      </div>
      <div>
        <h2
          style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}
        >
          Could not load workout
        </h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 360 }}>
          {message}
        </p>
      </div>
      <Button variant="secondary" size="md" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero card                                                            */
/* ------------------------------------------------------------------ */

interface HeroCardProps {
  workout: WorkoutDetail;
  sportColor: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToCalendar: () => void;
}

function HeroCard({
  workout,
  sportColor,
  onBack,
  onEdit,
  onDelete,
  onAddToCalendar,
}: HeroCardProps) {
  const { name, sport, description, estimatedDuration, tags, isTemplate } = workout;
  const emoji = SPORT_EMOJI[sport] ?? "🎯";

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <Button
        id="workout-back-btn"
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft size={14} />}
        onClick={onBack}
        aria-label="Back to workout library"
        style={{ alignSelf: "flex-start" }}
      >
        Workout Library
      </Button>

      {/* Hero card */}
      <Card
        variant="highlighted"
        accentColor={sportColor}
        style={{ borderRadius: "var(--radius-lg)", borderLeftWidth: 4 }}
      >
        {/* Top section: icon + name + template badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: `${sportColor}1A`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "var(--text-2xl)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {name}
              </h1>
              {isTemplate && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-accent)",
                    background: "rgba(139,92,246,0.12)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: "var(--radius-full)",
                    padding: "2px 9px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  System Template
                </span>
              )}
            </div>

            {/* Sport label */}
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                marginTop: 4,
                textTransform: "capitalize",
              }}
            >
              {sport}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 20,
            borderTop: "1px solid var(--border-subtle)",
            marginTop: 20,
            paddingTop: 16,
          }}
        >
          {estimatedDuration != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
              <span
                className="tabular-nums"
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {formatDuration(estimatedDuration)}
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                est.
              </span>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-full)",
                    padding: "3px 10px",
                    lineHeight: 1.6,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              borderTop: "1px solid var(--border-subtle)",
              marginTop: 16,
              paddingTop: 16,
            }}
          >
            {description}
          </p>
        )}

        {/* Action bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            borderTop: "1px solid var(--border-subtle)",
            marginTop: 20,
            paddingTop: 16,
          }}
        >
          {/* Add to calendar — primary CTA */}
          <Button
            id="workout-add-calendar-btn"
            variant="primary"
            size="md"
            leftIcon={<CalendarPlus size={15} />}
            onClick={onAddToCalendar}
            aria-label="Add this workout to your calendar"
          >
            Add to Calendar
          </Button>

          {/* Edit — only for user-created workouts */}
          {!isTemplate && (
            <Button
              id="workout-edit-btn"
              variant="secondary"
              size="md"
              leftIcon={<Edit2 size={14} />}
              onClick={onEdit}
              aria-label="Edit this workout"
            >
              Edit
            </Button>
          )}

          {/* Export FIT — Pro feature placeholder */}
          <Button
            id="workout-export-btn"
            variant="ghost"
            size="md"
            leftIcon={<Download size={14} />}
            onClick={() => {
              // TODO: check Pro tier, then call GET /workouts/{id}/export/fit
              alert("FIT export requires a Pro subscription.");
            }}
            aria-label="Export workout as FIT file (Pro)"
            title="Pro feature: Export as .FIT"
          >
            Export FIT
            <Lock size={12} aria-hidden="true" style={{ color: "var(--color-accent)", marginLeft: 4 }} />
          </Button>

          {/* Delete — only for user-created workouts */}
          {!isTemplate && (
            <Button
              id="workout-delete-btn"
              variant="danger"
              size="md"
              leftIcon={<Trash2 size={14} />}
              onClick={onDelete}
              aria-label="Delete this workout"
              style={{ marginLeft: "auto" }}
            >
              Delete
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                 */
/* ------------------------------------------------------------------ */

interface Props {
  params: Promise<{ id: string }>;
}

export default function WorkoutDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { execute: executeDelete, loading: deleting } = useAsync(workoutsService.delete);

  /* ── Data fetch ── */
  const { data: workout, loading, error, errorMessage, refetch } =
    useQuery<WorkoutDetail>(`/workouts/${id}`);

  /* ── Navigation ── */
  const handleBack = useCallback(() => {
    router.push("/workouts");
  }, [router]);

  const handleEdit = useCallback(() => {
    // TODO: navigate to workout builder when F09 is built
    router.push(`/workouts/${id}/edit`);
  }, [router, id]);

  const handleAddToCalendar = useCallback(() => {
    // TODO: open calendar assignment sheet in F10
    router.push("/calendar");
  }, [router]);

  /* ── Delete flow ── */
  const handleDeleteConfirm = useCallback(async () => {
    // workoutsService.delete returns Promise<void>.
    // useAsync.execute returns the result or null on error.
    // void functions return undefined, so null === error, non-null (undefined) === success.
    const result = await executeDelete(id);
    if (result !== null) {
      // undefined returned → delete succeeded
      router.push("/workouts");
    }
    // null returned → useAsync caught an error — modal stays open
  }, [executeDelete, id, router]);

  /* ── Loading ── */
  if (loading) {
    return (
      <main id="workout-detail" className="flex-1 px-4 lg:px-6 py-5" aria-label="Workout detail loading">
        <WorkoutDetailSkeleton />
      </main>
    );
  }

  /* ── Error ── */
  if (error || !workout) {
    return (
      <main id="workout-detail" className="flex-1 px-4 lg:px-6 py-5" aria-label="Workout detail error">
        <ErrorState
          message={errorMessage ?? "Workout not found."}
          onRetry={refetch}
        />
      </main>
    );
  }

  const sportColor = SPORT_COLOR[workout.sport] ?? SPORT_COLOR.other;

  return (
    <main
      id="workout-detail"
      className="flex-1 px-4 lg:px-6 py-5"
      aria-label={`Workout detail: ${workout.name}`}
    >
      <div className="flex flex-col gap-5 max-w-3xl mx-auto">
        {/* Hero */}
        <HeroCard
          workout={workout}
          sportColor={sportColor}
          onBack={handleBack}
          onEdit={handleEdit}
          onDelete={() => setShowDeleteModal(true)}
          onAddToCalendar={handleAddToCalendar}
        />

        {/* Steps */}
        <Card variant="default" noPadding>
          <CardHeader style={{ padding: "var(--space-5) var(--space-5) 0" }}>
            Workout Structure
            <span
              style={{
                marginLeft: 8,
                fontSize: "var(--text-sm)",
                fontWeight: 400,
                color: "var(--text-muted)",
              }}
            >
              ({workout.steps.length} step{workout.steps.length !== 1 ? "s" : ""})
            </span>
          </CardHeader>
          <CardBody style={{ padding: "var(--space-4) var(--space-5) var(--space-5)" }}>
            <WorkoutStepList steps={workout.steps} />
          </CardBody>
        </Card>

        {/* Metadata card */}
        <Card variant="default">
          <CardHeader>Details</CardHeader>
          <CardBody>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "10px 24px",
                fontSize: "var(--text-sm)",
              }}
            >
              {[
                { label: "Sport", value: workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1) },
                { label: "Source", value: workout.isTemplate ? "CoachFit Template" : "My Library" },
                { label: "Created", value: new Date(workout.createdAt).toLocaleDateString(undefined, { dateStyle: "long" }) },
                { label: "Updated", value: new Date(workout.updatedAt).toLocaleDateString(undefined, { dateStyle: "long" }) },
              ].map(({ label, value }) => (
                <React.Fragment key={label}>
                  <dt style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}</dt>
                  <dd style={{ color: "var(--text-primary)", margin: 0 }}>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <WorkoutDeleteModal
          workoutName={workout.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
    </main>
  );
}
