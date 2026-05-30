"use client";

/**
 * /workouts/[id]/edit — Edit an existing workout.
 *
 * Fetches the workout detail on mount, then passes it to
 * WorkoutBuilderPage as initialWorkout for pre-population.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { WorkoutBuilderPage } from "@/components/workout/builder/WorkoutBuilderPage";
import { workoutsService } from "@/lib/services/workouts";
import type { WorkoutDetail } from "@/lib/types/workout";
import { Loader2, AlertCircle } from "lucide-react";

export default function EditWorkoutPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [workout, setWorkout] = React.useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    workoutsService
      .get(id)
      .then(setWorkout)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load workout");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "var(--text-muted)",
        }}
      >
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-accent)" }} />
        <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>Loading workout…</p>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "var(--color-danger)",
        }}
      >
        <AlertCircle size={28} />
        <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>
          {error ?? "Workout not found"}
        </p>
      </div>
    );
  }

  return <WorkoutBuilderPage initialWorkout={workout} />;
}
