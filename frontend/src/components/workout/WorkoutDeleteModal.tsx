"use client";

/**
 * WorkoutDeleteModal — confirms irreversible deletion of a workout.
 *
 * Usage:
 *   <WorkoutDeleteModal
 *     workoutName="Tempo Intervals"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *     loading={deleting}
 *   />
 */

import * as React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface WorkoutDeleteModalProps {
  workoutName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WorkoutDeleteModal({
  workoutName,
  onConfirm,
  onCancel,
  loading = false,
}: WorkoutDeleteModalProps) {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, onCancel]);

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      {/* Dialog panel */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          maxWidth: 440,
          width: "100%",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          animation: "fadeInScale 200ms ease-out",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                background: "var(--color-danger-12)",
                border: "1px solid var(--color-danger-25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <AlertTriangle size={22} style={{ color: "var(--color-danger)" }} />
            </div>
            <h2
              id="delete-modal-title"
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Delete Workout
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <p
          id="delete-modal-desc"
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "var(--text-primary)" }}>&ldquo;{workoutName}&rdquo;</strong>?{" "}
          This action cannot be undone.
        </p>

        {/* Warning note */}
        <div
          style={{
            background: "var(--color-danger-6)",
            border: "1px solid var(--color-danger-15)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}
        >
          ⚠️ Deleting this workout will not remove it from past calendar events or logged activities.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            id="delete-cancel-btn"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            id="delete-confirm-btn"
            variant="danger"
            size="md"
            onClick={onConfirm}
            loading={loading}
            leftIcon={!loading ? <Trash2 size={15} /> : undefined}
          >
            Delete Workout
          </Button>
        </div>
      </div>
    </div>
  );
}
