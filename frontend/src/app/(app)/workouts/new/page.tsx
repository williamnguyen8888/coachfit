"use client";

/**
 * /workouts/new — Create a new workout from scratch.
 * Mounts WorkoutBuilderPage with an empty initial state.
 */

import { WorkoutBuilderPage } from "@/components/workout/builder/WorkoutBuilderPage";

export default function NewWorkoutPage() {
  return <WorkoutBuilderPage />;
}
