/**
 * ActivityNotesCard.tsx
 * Coach / athlete notes for an activity — persisted to the backend via
 * PUT /activities/{id} (description field).
 *
 * Shows the current description and allows inline editing with auto-save.
 */
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Check, Edit3, Loader2, MessageSquare, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

  // Sync if parent prop changes
  useEffect(() => {
    if (!editing) setValue(description ?? "");
  }, [description, editing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
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

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-text-muted" />
          <h3 className="text-sm font-bold text-text-primary">Notes</h3>
        </div>

        {!editing && (
          <button
            id="notes-edit-btn"
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1 text-xs text-text-muted transition-all hover:bg-bg-elevated hover:text-text-primary"
          >
            <Edit3 size={11} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            id="notes-textarea"
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="Add notes about this session: how it felt, what you noticed, goals met..."
            className="w-full resize-y rounded-xl border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none placeholder-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">Ctrl+Enter to save · Esc to cancel</span>
            <div className="flex items-center gap-2">
              <button
                id="notes-cancel-btn"
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-all hover:bg-bg-elevated disabled:opacity-50"
              >
                <X size={11} />
                Cancel
              </button>
              <button
                id="notes-save-btn"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-400 transition-all hover:bg-green-500/25 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Check size={11} />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      ) : description ? (
        <div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {description}
          </p>
          {savedAt && (
            <p className="mt-2 text-[10px] text-text-muted">
              Saved {savedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      ) : (
        <button
          id="notes-add-btn"
          onClick={startEdit}
          className="w-full rounded-xl border border-dashed border-border-default py-6 text-xs text-text-muted transition-all hover:border-border-subtle hover:bg-bg-elevated/30 hover:text-text-secondary"
        >
          + Add notes about this workout…
        </button>
      )}
    </Card>
  );
}
