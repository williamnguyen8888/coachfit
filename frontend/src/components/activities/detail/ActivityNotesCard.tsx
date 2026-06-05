/**
 * ActivityNotesCard.tsx
 * Coach / athlete notes — minimal inline design.
 * - No notes: a subtle single-line prompt, barely visible
 * - Has notes: compact inline display with edit on hover
 * - Editing: expands to full textarea with save/cancel
 */
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Check, Edit3, Loader2, MessageSquare, X } from "lucide-react";
import { activitiesService } from "@/lib/services/activities";

interface Props {
  activityId: string;
  description: string | null;
  onDescriptionSaved?: (description: string | null) => void;
}

export function ActivityNotesCard({ activityId, description, onDescriptionSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setValue(description ?? "");
  }, [description, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const startEdit = () => {
    setValue(description ?? "");
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setValue(description ?? "");
    setEditing(false);
    setError(null);
  };

  const saveEdit = async () => {
    const trimmed = value.trim();
    setSaving(true);
    setError(null);
    try {
      await activitiesService.update(activityId, { description: trimmed || undefined });
      setSavedAt(new Date());
      setEditing(false);
      onDescriptionSaved?.(trimmed || null);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") cancelEdit();
    if (e.key === "Enter" && e.ctrlKey) void saveEdit();
  };

  // ── Editing mode: full card ──
  if (editing) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-bg-elevated/50 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            <MessageSquare size={12} />
            Notes
          </div>
          <span className="text-[10px] text-text-muted">Ctrl+Enter to save · Esc to cancel</span>
        </div>
        <textarea
          id="notes-textarea"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Add notes about this session: how it felt, goals met, things to improve..."
          className="w-full resize-none rounded-xl border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none placeholder-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          disabled={saving}
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        <div className="mt-2.5 flex justify-end gap-2">
          <button
            id="notes-cancel-btn"
            onClick={cancelEdit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition-all hover:text-text-primary disabled:opacity-50"
          >
            <X size={11} />
            Cancel
          </button>
          <button
            id="notes-save-btn"
            onClick={() => void saveEdit()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-all hover:bg-accent/25 disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── Has notes: inline display with edit button on hover ──
  if (description) {
    return (
      <div className="group relative rounded-xl border border-border-subtle/40 bg-bg-elevated/20 px-4 py-3 transition-all hover:border-border-subtle hover:bg-bg-elevated/40">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            <MessageSquare size={10} />
            Notes
          </div>
          <button
            id="notes-edit-btn"
            onClick={startEdit}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-bg-elevated hover:text-text-primary"
          >
            <Edit3 size={10} />
            Edit
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
        {savedAt && (
          <p className="mt-1.5 text-[10px] text-text-muted">
            Saved {savedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    );
  }

  // ── No notes: minimal single-line prompt ──
  return (
    <button
      id="notes-add-btn"
      onClick={startEdit}
      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border-subtle/30 px-4 py-2.5 text-xs text-text-muted/50 transition-all hover:border-border-subtle hover:text-text-muted"
    >
      <MessageSquare size={11} />
      Add a note about this session…
    </button>
  );
}
