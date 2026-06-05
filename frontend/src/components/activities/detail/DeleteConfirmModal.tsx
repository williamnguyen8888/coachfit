/**
 * DeleteConfirmModal.tsx
 * Accessible confirmation dialog for deleting an activity.
 * Replaces the browser-native window.confirm() anti-pattern.
 */
"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

interface Props {
  activityName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ activityName, isDeleting = false, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on mount for safety
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDeleting, onCancel]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface shadow-2xl"
          style={{ animation: "fadeInScale 0.18s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border-subtle px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h2
                  id="delete-modal-title"
                  className="text-sm font-bold text-text-primary"
                >
                  Delete Activity
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p id="delete-modal-desc" className="text-sm leading-relaxed text-text-secondary">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-text-primary">
                &ldquo;{activityName}&rdquo;
              </span>
              ? All associated data including streams, laps, and metrics will be removed.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-6 py-4">
            <button
              ref={cancelRef}
              id="delete-modal-cancel"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-xl border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              id="delete-modal-confirm"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/25 hover:border-red-500/50 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  Delete Activity
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
