// src/lib/types/builder.ts
// Local types for the visual workout builder (F09).
// These extend the API workout types with UI-only fields (uid, etc.)
// and are stripped back to WorkoutPayload before saving.

import type { Sport } from "./activity";
import type { StepDuration, StepTarget, StepType } from "./workout";

// ─── Builder step ─────────────────────────────────────────────────────────────

/** A leaf step (warmup / work / rest / cooldown). */
export interface BuilderLeafStep {
  uid: string; // local UUID — never sent to API
  type: Exclude<StepType, "repeat" | "other">;
  duration: StepDuration;
  target: StepTarget;
  notes?: string;
}

/** A repeat group (max nesting depth = 1, no nested repeats). */
export interface BuilderRepeatStep {
  uid: string;
  type: "repeat";
  count: number; // 1–99
  steps: BuilderLeafStep[]; // child leaf steps only
}

export type BuilderStep = BuilderLeafStep | BuilderRepeatStep;

// ─── Builder state ────────────────────────────────────────────────────────────

export interface BuilderState {
  name: string;
  sport: Sport;
  description: string;
  tags: string[];
  steps: BuilderStep[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_DURATION: StepDuration = { type: "time", value: 300 };
export const DEFAULT_TARGET: StepTarget = { type: "open" };

export function makeLeafStep(
  type: BuilderLeafStep["type"],
  overrides?: Partial<BuilderLeafStep>
): BuilderLeafStep {
  return {
    uid: crypto.randomUUID(),
    type,
    duration: { ...DEFAULT_DURATION },
    target: { ...DEFAULT_TARGET },
    ...overrides,
  };
}

export function makeRepeatStep(count = 3): BuilderRepeatStep {
  return {
    uid: crypto.randomUUID(),
    type: "repeat",
    count,
    steps: [
      makeLeafStep("work", { duration: { type: "time", value: 600 }, target: { type: "power_zone", zone: 4 } }),
      makeLeafStep("rest", { duration: { type: "time", value: 300 }, target: { type: "power_zone", zone: 1 } }),
    ],
  };
}

export const INITIAL_BUILDER_STATE: BuilderState = {
  name: "",
  sport: "cycling",
  description: "",
  tags: [],
  steps: [],
};
