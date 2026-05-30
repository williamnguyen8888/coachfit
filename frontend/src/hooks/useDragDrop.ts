"use client";

// src/hooks/useDragDrop.ts
// Shared drag-and-drop logic for the calendar grid.
// Handles HTML5 drag events (desktop) and touch-based drag (mobile).
//
// Design spec: docs/09-design-system.md § Animation & Transitions
// — "Drag: smooth follow with slight overshoot"
// — "Touch targets: min 44×44px"

import { useRef, useState, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DragState {
  /** ID of the event currently being dragged */
  draggingId: string | null;
  /** ISO date string of the column/cell currently being dragged over */
  dragOverDate: string | null;
  /** Whether we are in a same-day reorder (drag from and to same date) */
  isSameDay: boolean;
  /** Source date of the dragging event */
  dragFromDate: string | null;
}

export interface UseDragDropOptions {
  /** Called when an event is moved to a different date */
  onMove: (eventId: string, toDate: string) => void;
  /** Called when events on the same day are reordered */
  onReorder: (date: string, orderedIds: string[]) => void;
  /** Map of date → ordered event IDs (used for reorder calculation) */
  eventIdsByDate: Record<string, string[]>;
}

export interface UseDragDropReturn {
  dragState: DragState;

  // ── Chip drag handlers (HTML5) ────────────────────────────────────────────
  getChipDragProps: (eventId: string, date: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };

  // ── Drop zone handlers (HTML5) ────────────────────────────────────────────
  getDropZoneProps: (date: string, inMonth?: boolean) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };

  // ── Same-day reorder drop line ────────────────────────────────────────────
  /** Index (in the day's event list) that the dragged item would land before */
  reorderDropIndex: number | null;
  onChipDragOver: (e: React.DragEvent, date: string, eventIndex: number) => void;

  // ── Touch / long-press (mobile) ───────────────────────────────────────────
  getTouchDragProps: (eventId: string, date: string) => {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };

  /** Whether touch-drag mode is active */
  isTouchDragging: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAG_DATA_KEY = "text/x-coachfit-event-id";
const LONG_PRESS_MS = 500;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDragDrop({
  onMove,
  onReorder,
  eventIdsByDate,
}: UseDragDropOptions): UseDragDropReturn {
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    dragOverDate: null,
    isSameDay: false,
    dragFromDate: null,
  });

  const [reorderDropIndex, setReorderDropIndex] = useState<number | null>(null);

  // ── Touch drag state ───────────────────────────────────────────────────────
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchCloneRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragInfoRef = useRef<{ eventId: string; fromDate: string } | null>(null);

  // Cleanup clone on unmount
  useEffect(() => {
    return () => {
      if (touchCloneRef.current) {
        touchCloneRef.current.remove();
        touchCloneRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // ── HTML5 chip drag ────────────────────────────────────────────────────────

  const getChipDragProps = useCallback(
    (eventId: string, date: string) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData(DRAG_DATA_KEY, eventId);
        e.dataTransfer.effectAllowed = "move";
        // Defer state update so the ghost image renders first
        setTimeout(() => {
          setDragState({
            draggingId: eventId,
            dragFromDate: date,
            dragOverDate: date,
            isSameDay: true,
          });
        }, 0);
      },
      onDragEnd: () => {
        setDragState({
          draggingId: null,
          dragFromDate: null,
          dragOverDate: null,
          isSameDay: false,
        });
        setReorderDropIndex(null);
      },
    }),
    [],
  );

  // ── HTML5 drop zone ────────────────────────────────────────────────────────

  const getDropZoneProps = useCallback(
    (date: string, inMonth = true) => ({
      onDragOver: (e: React.DragEvent) => {
        if (!inMonth) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragState((prev) => {
          if (prev.dragOverDate === date) return prev;
          return {
            ...prev,
            dragOverDate: date,
            isSameDay: prev.dragFromDate === date,
          };
        });
      },
      onDragLeave: (e: React.DragEvent) => {
        // Only clear if leaving the drop zone itself (not a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragState((prev) => ({ ...prev, dragOverDate: null, isSameDay: false }));
          setReorderDropIndex(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData(DRAG_DATA_KEY);
        if (!eventId) return;

        const fromDate = dragState.dragFromDate;
        if (!fromDate) return;

        if (fromDate === date) {
          // Same-day reorder
          const ids = eventIdsByDate[date] ?? [];
          const fromIdx = ids.indexOf(eventId);
          const toIdx = reorderDropIndex ?? ids.length - 1;
          if (fromIdx === -1 || fromIdx === toIdx) return;

          const reordered = [...ids];
          reordered.splice(fromIdx, 1);
          reordered.splice(toIdx, 0, eventId);
          onReorder(date, reordered);
        } else {
          // Move to different date
          onMove(eventId, date);
        }

        setDragState({
          draggingId: null,
          dragFromDate: null,
          dragOverDate: null,
          isSameDay: false,
        });
        setReorderDropIndex(null);
      },
    }),
    [dragState.dragFromDate, reorderDropIndex, eventIdsByDate, onMove, onReorder],
  );

  // ── Same-day reorder: chip drag-over ──────────────────────────────────────

  const onChipDragOver = useCallback(
    (e: React.DragEvent, date: string, eventIndex: number) => {
      if (dragState.dragFromDate !== date) return;
      e.preventDefault();
      e.stopPropagation();
      // Determine if drop point is top or bottom half of the chip
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const insertBefore = e.clientY < mid ? eventIndex : eventIndex + 1;
      setReorderDropIndex(insertBefore);
    },
    [dragState.dragFromDate],
  );

  // ── Touch drag (long-press + move + drop) ─────────────────────────────────

  const getTouchDragProps = useCallback(
    (eventId: string, date: string) => ({
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const target = e.currentTarget as HTMLElement;

        longPressTimerRef.current = setTimeout(() => {
          // Activate touch-drag
          touchDragInfoRef.current = { eventId, fromDate: date };
          setIsTouchDragging(true);
          setDragState({
            draggingId: eventId,
            dragFromDate: date,
            dragOverDate: date,
            isSameDay: true,
          });

          // Haptic feedback
          if ("vibrate" in navigator) navigator.vibrate(50);

          // Create a floating clone
          const clone = target.cloneNode(true) as HTMLElement;
          const rect = target.getBoundingClientRect();
          clone.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.9;
            transform: scale(1.04);
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            transition: transform 0.1s ease-out;
            border-radius: var(--radius-sm);
          `;
          document.body.appendChild(clone);
          touchCloneRef.current = clone;

          // Ghost original
          target.style.opacity = "0.3";
        }, LONG_PRESS_MS);
      },

      onTouchMove: (e: React.TouchEvent) => {
        if (!isTouchDragging || !touchCloneRef.current) {
          // Cancel long-press if moved too much before timer fires
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          return;
        }

        e.preventDefault(); // prevent scroll during touch drag

        const touch = e.touches[0];
        const clone = touchCloneRef.current;
        const rect = clone.getBoundingClientRect();
        clone.style.top = `${touch.clientY - rect.height / 2}px`;
        clone.style.left = `${touch.clientX - rect.width / 2}px`;

        // Detect which drop zone is under the finger
        clone.style.display = "none";
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        clone.style.display = "";

        const dropZone = el?.closest("[data-drop-date]") as HTMLElement | null;
        const overDate = dropZone?.dataset.dropDate ?? null;

        setDragState((prev) => ({
          ...prev,
          dragOverDate: overDate,
          isSameDay: overDate === touchDragInfoRef.current?.fromDate,
        }));
      },

      onTouchEnd: (e: React.TouchEvent) => {
        // Cancel long-press timer if still pending
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        if (!isTouchDragging) return;

        const touch = e.changedTouches[0];

        // Find drop target
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = el?.closest("[data-drop-date]") as HTMLElement | null;
        const toDate = dropZone?.dataset.dropDate ?? null;
        const info = touchDragInfoRef.current;

        if (toDate && info) {
          if (toDate === info.fromDate) {
            // Same-day — just leave order as is (no reorder on touch for now)
          } else {
            onMove(info.eventId, toDate);
          }
        }

        // Restore original chip opacity
        const original = document.querySelector(
          `[data-event-id="${info?.eventId}"]`,
        ) as HTMLElement | null;
        if (original) original.style.opacity = "";

        // Remove clone
        if (touchCloneRef.current) {
          touchCloneRef.current.remove();
          touchCloneRef.current = null;
        }

        touchDragInfoRef.current = null;
        setIsTouchDragging(false);
        setDragState({
          draggingId: null,
          dragFromDate: null,
          dragOverDate: null,
          isSameDay: false,
        });
        setReorderDropIndex(null);
      },
    }),
    [isTouchDragging, onMove],
  );

  return {
    dragState,
    getChipDragProps,
    getDropZoneProps,
    reorderDropIndex,
    onChipDragOver,
    getTouchDragProps,
    isTouchDragging,
  };
}
