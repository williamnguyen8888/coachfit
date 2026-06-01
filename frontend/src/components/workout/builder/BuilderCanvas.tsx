"use client";

/**
 * BuilderCanvas — drag-and-drop step list using @dnd-kit/sortable.
 *
 * Manages top-level step ordering. Each step is wrapped in BuilderStepCard
 * which exposes its own drag handle via useSortable.
 *
 * Passes all edit/delete callbacks down to cards.
 */

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ListPlus } from "lucide-react";
import { BuilderStepCard, type BuilderStepCardProps } from "./BuilderStepCard";
import type { BuilderStep } from "@/lib/types/builder";
import type { Sport } from "@/lib/types/activity";

// Restrict dragging to the vertical axis only (replaces @dnd-kit/modifiers)
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface BuilderCanvasProps {
  steps: BuilderStep[];
  sport: Sport;
  onReorder: (steps: BuilderStep[]) => void;
  onDelete: BuilderStepCardProps["onDelete"];
  onUpdateLeaf: BuilderStepCardProps["onUpdateLeaf"];
  onUpdateRepeat: BuilderStepCardProps["onUpdateRepeat"];
  onDeleteChild: BuilderStepCardProps["onDeleteChild"];
  onAddChild: BuilderStepCardProps["onAddChild"];
  onEditDuration: BuilderStepCardProps["onEditDuration"];
  onEditTarget: BuilderStepCardProps["onEditTarget"];
  onEditChildDuration: BuilderStepCardProps["onEditChildDuration"];
  onEditChildTarget: BuilderStepCardProps["onEditChildTarget"];
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function BuilderCanvas({
  steps,
  sport,
  onReorder,
  onDelete,
  onUpdateLeaf,
  onUpdateRepeat,
  onDeleteChild,
  onAddChild,
  onEditDuration,
  onEditTarget,
  onEditChildDuration,
  onEditChildTarget,
}: BuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = steps.findIndex((s) => s.uid === active.id);
      const newIdx = steps.findIndex((s) => s.uid === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorder(arrayMove(steps, oldIdx, newIdx));
      }
    }
  }

  if (steps.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          border: "2px dashed var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
          color: "var(--text-muted)",
          gap: 8,
          textAlign: "center",
        }}
      >
        <ListPlus size={28} strokeWidth={1.75} />
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", margin: 0 }}>
          No workout blocks yet
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
          Add warm-up, work, ramp, rest, free, or repeat blocks to build the session.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map((s) => s.uid)}
        strategy={verticalListSortingStrategy}
      >
        <div
          role="list"
          aria-label="Workout steps"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {steps.map((step) => (
            <div role="listitem" key={step.uid}>
              <BuilderStepCard
                step={step}
                sport={sport}
                onDelete={onDelete}
                onUpdateLeaf={onUpdateLeaf}
                onUpdateRepeat={onUpdateRepeat}
                onDeleteChild={onDeleteChild}
                onAddChild={onAddChild}
                onEditDuration={onEditDuration}
                onEditTarget={onEditTarget}
                onEditChildDuration={onEditChildDuration}
                onEditChildTarget={onEditChildTarget}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
