"use client";

/**
 * WorkoutBuilderPage — visual workout builder orchestrator (F09).
 *
 * Shared by:
 *   /workouts/new      → initialState = empty
 *   /workouts/[id]/edit → initialState = loaded from API
 *
 * Responsibilities:
 *   1. Manage BuilderState (steps, name, sport, description)
 *   2. Render BuilderHeader, BuilderCanvas, StepTypeMenu, WorkoutPreview
 *   3. Open/close DurationEditor, TargetEditor, ScheduleModal
 *   4. Wire save → POST/PUT /workouts
 *   5. Wire schedule → POST /calendar
 *   6. Wire export FIT → GET /workouts/{id}/export/fit → download
 *
 * Constraints from docs/07-workout-data-model.md:
 *   - steps.length >= 1 (validated on save)
 *   - repeat nesting depth = 1 (repeat cannot contain repeat)
 *   - repeat count 1–99
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BuilderHeader } from "./BuilderHeader";
import { BuilderCanvas } from "./BuilderCanvas";
import { StepTypeMenu } from "./StepTypeMenu";
import { DurationEditor } from "./DurationEditor";
import { TargetEditor } from "./TargetEditor";
import { ScheduleModal } from "./ScheduleModal";
import { WorkoutPreview } from "./WorkoutPreview";
import { workoutsService } from "@/lib/services/workouts";
import type { WorkoutDetail } from "@/lib/types/workout";
import type {
  BuilderState,
  BuilderStep,
  BuilderLeafStep,
  BuilderRepeatStep,
} from "@/lib/types/builder";
import {
  makeLeafStep,
  makeRepeatStep,
  INITIAL_BUILDER_STATE,
} from "@/lib/types/builder";
import type { StepDuration, StepTarget, WorkoutStep } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Serialize builder → API payload                                      */
/* ------------------------------------------------------------------ */

function builderStepToApi(step: BuilderStep): WorkoutStep {
  if (step.type === "repeat") {
    return {
      type: "repeat",
      count: step.count,
      steps: step.steps.map(builderStepToApi),
    };
  }
  return {
    type: step.type,
    duration: step.duration,
    target: step.target,
    description: step.notes,
  };
}

/* ------------------------------------------------------------------ */
/*  Deserialize API workout → builder state                              */
/* ------------------------------------------------------------------ */

function apiStepToBuilder(step: WorkoutStep): BuilderStep {
  if (step.type === "repeat") {
    return {
      uid: crypto.randomUUID(),
      type: "repeat",
      count: step.count ?? 3,
      steps: (step.steps ?? [])
        .filter((s) => s.type !== "repeat") // enforce depth = 1
        .map((s) => apiStepToBuilder(s) as BuilderLeafStep),
    } satisfies BuilderRepeatStep;
  }
  return {
    uid: crypto.randomUUID(),
    type: step.type as BuilderLeafStep["type"],
    duration: step.duration ?? { type: "time", value: 300 },
    target: step.target ?? { type: "open" },
    notes: step.description,
  } satisfies BuilderLeafStep;
}

function workoutDetailToBuilderState(detail: WorkoutDetail): BuilderState {
  return {
    name: detail.name,
    sport: detail.sport,
    description: detail.description ?? "",
    tags: detail.tags ?? [],
    steps: detail.steps.map(apiStepToBuilder),
  };
}

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface WorkoutBuilderPageProps {
  /** Provided when editing an existing workout */
  initialWorkout?: WorkoutDetail;
}

/* ------------------------------------------------------------------ */
/*  Active editor state                                                  */
/* ------------------------------------------------------------------ */

type EditorTarget =
  | { kind: "duration"; uid: string; parentUid?: undefined }
  | { kind: "target"; uid: string; parentUid?: undefined }
  | { kind: "child_duration"; uid: string; parentUid: string }
  | { kind: "child_target"; uid: string; parentUid: string };

/* ------------------------------------------------------------------ */
/*  Toast helper (simple)                                                */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let _toastId = 0;

/* ------------------------------------------------------------------ */
/*  Main component                                                       */
/* ------------------------------------------------------------------ */

export function WorkoutBuilderPage({ initialWorkout }: WorkoutBuilderPageProps) {
  const router = useRouter();

  // ── Builder state ──
  const [state, setState] = React.useState<BuilderState>(() =>
    initialWorkout ? workoutDetailToBuilderState(initialWorkout) : INITIAL_BUILDER_STATE
  );
  const [savedId, setSavedId] = React.useState<string | undefined>(initialWorkout?.id);

  // ── UI state ──
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [activeEditor, setActiveEditor] = React.useState<EditorTarget | null>(null);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | undefined>(undefined);
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  // ── Toast ──
  function showToast(message: string, type: "success" | "error") {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  // ── State patch helpers ──
  function patchState(patch: Partial<BuilderState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  // ── Step mutations ──

  function addTopLevelStep(type: BuilderLeafStep["type"] | "repeat") {
    const newStep: BuilderStep =
      type === "repeat" ? makeRepeatStep() : makeLeafStep(type);
    patchState({ steps: [...state.steps, newStep] });
  }

  function deleteStep(uid: string) {
    patchState({ steps: state.steps.filter((s) => s.uid !== uid) });
  }

  function updateLeafStep(uid: string, patch: Partial<BuilderLeafStep>) {
    patchState({
      steps: state.steps.map((s) =>
        s.uid === uid && s.type !== "repeat"
          ? ({ ...s, ...patch } as BuilderLeafStep)
          : s
      ),
    });
  }

  function updateRepeatStep(uid: string, patch: Partial<BuilderRepeatStep>) {
    patchState({
      steps: state.steps.map((s) =>
        s.uid === uid && s.type === "repeat"
          ? ({ ...s, ...patch } as BuilderRepeatStep)
          : s
      ),
    });
  }

  function deleteChildStep(parentUid: string, childUid: string) {
    patchState({
      steps: state.steps.map((s) => {
        if (s.uid !== parentUid || s.type !== "repeat") return s;
        return { ...s, steps: s.steps.filter((c) => c.uid !== childUid) } as BuilderRepeatStep;
      }),
    });
  }

  function addChildStep(parentUid: string) {
    patchState({
      steps: state.steps.map((s) => {
        if (s.uid !== parentUid || s.type !== "repeat") return s;
        return { ...s, steps: [...s.steps, makeLeafStep("work")] } as BuilderRepeatStep;
      }),
    });
  }

  function updateChildLeafStep(
    parentUid: string,
    childUid: string,
    patch: Partial<BuilderLeafStep>
  ) {
    patchState({
      steps: state.steps.map((s) => {
        if (s.uid !== parentUid || s.type !== "repeat") return s;
        return {
          ...s,
          steps: s.steps.map((c) =>
            c.uid === childUid ? ({ ...c, ...patch } as BuilderLeafStep) : c
          ),
        };
      }),
    });
  }

  // ── Find the step being edited ──
  function findStepForEditor(): BuilderLeafStep | null {
    if (!activeEditor) return null;
    if (activeEditor.kind === "duration" || activeEditor.kind === "target") {
      const s = state.steps.find((s) => s.uid === activeEditor.uid);
      if (!s || s.type === "repeat") return null;
      return s as BuilderLeafStep;
    }
    // child step
    const parent = state.steps.find((s) => s.uid === activeEditor.parentUid);
    if (!parent || parent.type !== "repeat") return null;
    return parent.steps.find((c) => c.uid === activeEditor.uid) ?? null;
  }

  // ── Duration editor save ──
  function handleDurationSave(d: StepDuration) {
    if (!activeEditor) return;
    if (activeEditor.kind === "duration") {
      updateLeafStep(activeEditor.uid, { duration: d });
    } else if (activeEditor.kind === "child_duration") {
      updateChildLeafStep(activeEditor.parentUid, activeEditor.uid, { duration: d });
    }
    setActiveEditor(null);
  }

  // ── Target editor save ──
  function handleTargetSave(t: StepTarget) {
    if (!activeEditor) return;
    if (activeEditor.kind === "target") {
      updateLeafStep(activeEditor.uid, { target: t });
    } else if (activeEditor.kind === "child_target") {
      updateChildLeafStep(activeEditor.parentUid, activeEditor.uid, { target: t });
    }
    setActiveEditor(null);
  }

  // ── Validate ──
  function validate(): boolean {
    if (!state.name.trim()) {
      setNameError("Workout name is required");
      return false;
    }
    if (state.steps.length === 0) {
      showToast("Add at least one step before saving", "error");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  // ── Save ──
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: state.name.trim(),
        sport: state.sport,
        description: state.description || undefined,
        steps: state.steps.map(builderStepToApi),
        tags: state.tags,
      };

      let result;
      if (savedId) {
        result = await workoutsService.update(savedId, payload);
      } else {
        result = await workoutsService.create(payload);
        setSavedId(result.id);
        // Update URL without full navigation
        window.history.replaceState(null, "", `/workouts/${result.id}/edit`);
      }
      showToast("Workout saved!", "success");
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Schedule ──
  function handleSchedule() {
    if (!savedId) {
      showToast("Save the workout first", "error");
      return;
    }
    setShowScheduleModal(true);
  }

  // ── Export FIT ──
  async function handleExportFit() {
    if (!savedId) {
      showToast("Save the workout first", "error");
      return;
    }
    setExporting(true);
    try {
      const { downloadUrl: url } = await workoutsService.exportFit(savedId);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.name.replace(/[^a-z0-9]/gi, "_")}.fit`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("FIT file downloaded!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      showToast(msg, "error");
    } finally {
      setExporting(false);
    }
  }

  // ── Editing step lookup ──
  const editingStep = findStepForEditor();

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--bg-primary)",
      }}
    >
      {/* ── Back navigation + title bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push("/workouts")}
          aria-label="Back to workouts"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            padding: "4px 6px",
            borderRadius: "var(--radius-sm)",
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
        >
          <ChevronLeft size={16} />
          Workouts
        </button>
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-default)",
          }}
        />
        <h1
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {savedId ? "Edit Workout" : "New Workout"}
        </h1>
      </div>

      {/* ── Scrollable body ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header card */}
        <BuilderHeader
          name={state.name}
          sport={state.sport}
          description={state.description}
          onNameChange={(v) => patchState({ name: v })}
          onSportChange={(v: Sport) => patchState({ sport: v })}
          onDescriptionChange={(v) => patchState({ description: v })}
          savedWorkoutId={savedId}
          onSave={handleSave}
          onSchedule={handleSchedule}
          onExportFit={handleExportFit}
          saving={saving}
          exporting={exporting}
          nameError={nameError}
        />

        {/* Preview chart */}
        <WorkoutPreview steps={state.steps} />

        {/* Canvas + steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Steps
              {state.steps.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  ({state.steps.length})
                </span>
              )}
            </h2>
            <Button
              id="builder-add-step-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setShowAddMenu(true)}
              aria-label="Add workout step"
            >
              Add Step
            </Button>
          </div>

          <BuilderCanvas
            steps={state.steps}
            sport={state.sport}
            onReorder={(steps) => patchState({ steps })}
            onDelete={deleteStep}
            onUpdateLeaf={updateLeafStep}
            onUpdateRepeat={updateRepeatStep}
            onDeleteChild={deleteChildStep}
            onAddChild={addChildStep}
            onEditDuration={(uid) => setActiveEditor({ kind: "duration", uid })}
            onEditTarget={(uid) => setActiveEditor({ kind: "target", uid })}
            onEditChildDuration={(parentUid, uid) =>
              setActiveEditor({ kind: "child_duration", uid, parentUid })
            }
            onEditChildTarget={(parentUid, uid) =>
              setActiveEditor({ kind: "child_target", uid, parentUid })
            }
          />
        </div>
      </div>

      {/* ── Modals ── */}

      {showAddMenu && (
        <StepTypeMenu
          onAdd={addTopLevelStep}
          onClose={() => setShowAddMenu(false)}
        />
      )}

      {activeEditor &&
        (activeEditor.kind === "duration" || activeEditor.kind === "child_duration") &&
        editingStep && (
          <DurationEditor
            value={editingStep.duration}
            onSave={handleDurationSave}
            onClose={() => setActiveEditor(null)}
          />
        )}

      {activeEditor &&
        (activeEditor.kind === "target" || activeEditor.kind === "child_target") &&
        editingStep && (
          <TargetEditor
            value={editingStep.target}
            sport={state.sport}
            onSave={handleTargetSave}
            onClose={() => setActiveEditor(null)}
          />
        )}

      {showScheduleModal && savedId && (
        <ScheduleModal
          workoutId={savedId}
          workoutName={state.name}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={(date) => {
            setShowScheduleModal(false);
            showToast(`Scheduled for ${date}!`, "success");
          }}
        />
      )}

      {/* ── Toast stack ── */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 100,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              background: t.type === "success" ? "var(--color-success-15)" : "var(--color-danger-15)",
              border: `1px solid ${t.type === "success" ? "var(--color-success)" : "var(--color-danger)"}`,
              color: t.type === "success" ? "var(--color-success)" : "var(--color-danger)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              boxShadow: "var(--shadow-md)",
              backdropFilter: "blur(8px)",
              animation: "fadeIn 200ms ease-out",
              pointerEvents: "auto",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Keyframe for toast ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
