"use client";

// src/components/activities/ActivityComments.tsx
// Threaded comment section for activities. Used by coach and athlete.

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Reply, Edit2, Trash2, Check, X } from "lucide-react";
import { commentsService } from "@/lib/services/coach";
import { useAuthStore } from "@/stores/auth.store";
import type { ActivityComment } from "@/lib/types/coach";
import { formatDistanceToNow } from "@/lib/utils/time";

interface ActivityCommentsProps {
  activityId: string;
}

function CommentAvatar({
  name,
  role,
}: {
  name: string;
  role: "athlete" | "coach" | "admin";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const bgColor =
    role === "coach"
      ? "var(--color-accent-20)"
      : "var(--bg-elevated)";
  const textColor =
    role === "coach"
      ? "var(--color-accent)"
      : "var(--text-secondary)";

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "var(--radius-full)",
        background: bgColor,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

interface SingleCommentProps {
  comment: ActivityComment;
  activityId: string;
  currentUserId: string | null;
  depth?: number;
  onReplySubmitted: () => void;
}

function SingleComment({
  comment,
  activityId,
  currentUserId,
  depth = 0,
  onReplySubmitted,
}: SingleCommentProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);
  const isOwn = currentUserId === comment.author.id;

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      await commentsService.create(activityId, {
        content: replyContent.trim(),
        parentId: comment.id,
      });
      setReplyContent("");
      setReplyOpen(false);
      onReplySubmitted();
    } catch {
      // swallow
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setSubmitting(true);
    try {
      await commentsService.update(activityId, comment.id, editContent.trim());
      setEditMode(false);
      onReplySubmitted();
    } catch {
      // swallow
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    try {
      await commentsService.delete(activityId, comment.id);
      onReplySubmitted();
    } catch {
      // swallow
    }
  };

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
    } catch {
      return comment.createdAt;
    }
  })();

  return (
    <div
      style={{
        paddingLeft: depth > 0 ? "var(--space-8)" : 0,
        borderLeft: depth > 0 ? "2px solid var(--border-subtle)" : "none",
        marginLeft: depth > 0 ? "var(--space-3)" : 0,
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        <CommentAvatar name={comment.author.name} role={comment.author.role} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Author + meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {comment.author.name}
            </span>
            {comment.author.role === "coach" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  background: "var(--color-accent-8)",
                  border: "1px solid var(--color-accent-20)",
                  borderRadius: "var(--radius-full)",
                  padding: "1px 6px",
                }}
              >
                COACH
              </span>
            )}
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              {timeAgo}
            </span>
            {comment.edited && (
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                (edited)
              </span>
            )}
          </div>

          {/* Content */}
          {editMode ? (
            <div style={{ marginTop: "var(--space-2)" }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-3)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <div className="flex gap-2 mt-2">
                <ActionBtn
                  icon={Check}
                  label="Save"
                  color="var(--color-success)"
                  onClick={handleEdit}
                  disabled={submitting}
                />
                <ActionBtn
                  icon={X}
                  label="Cancel"
                  color="var(--text-muted)"
                  onClick={() => setEditMode(false)}
                />
              </div>
            </div>
          ) : (
            <p
              style={{
                marginTop: "var(--space-1)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!editMode && (
            <div className="flex items-center gap-3 mt-2">
              {depth === 0 && (
                <ActionBtn
                  icon={Reply}
                  label="Reply"
                  color="var(--text-muted)"
                  onClick={() => setReplyOpen((v) => !v)}
                />
              )}
              {isOwn && (
                <>
                  <ActionBtn
                    icon={Edit2}
                    label="Edit"
                    color="var(--text-muted)"
                    onClick={() => setEditMode(true)}
                  />
                  <ActionBtn
                    icon={Trash2}
                    label="Delete"
                    color="var(--color-danger)"
                    onClick={handleDelete}
                  />
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {replyOpen && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-3)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  resize: "none",
                  outline: "none",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || submitting}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background:
                      replyContent.trim() && !submitting
                        ? "var(--color-accent)"
                        : "var(--bg-elevated)",
                    color:
                      replyContent.trim() && !submitting
                        ? "white"
                        : "var(--text-muted)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    cursor: replyContent.trim() && !submitting ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Sending…" : "Reply"}
                </button>
                <button
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyContent("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "var(--text-xs)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div
          style={{
            marginTop: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {comment.replies.map((reply) => (
            <SingleComment
              key={reply.id}
              comment={reply}
              activityId={activityId}
              currentUserId={currentUserId}
              depth={1}
              onReplySubmitted={onReplySubmitted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        border: "none",
        background: "transparent",
        color,
        fontSize: "var(--text-xs)",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  );
}

export function ActivityComments({ activityId }: ActivityCommentsProps) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commentsService.list(activityId);
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await commentsService.create(activityId, {
        content: newComment.trim(),
        parentId: null,
      });
      setNewComment("");
      load();
    } catch {
      // swallow
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={14} style={{ color: "var(--text-muted)" }} />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Comments
        </span>
        {comments.length > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--color-accent)",
              background: "var(--color-accent-8)",
              borderRadius: "var(--radius-full)",
              padding: "1px 6px",
            }}
          >
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Loading…
        </div>
      ) : comments.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
          }}
        >
          No comments yet. Be the first to comment.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {comments.map((comment) => (
            <SingleComment
              key={comment.id}
              comment={comment}
              activityId={activityId}
              currentUserId={user?.id ?? null}
              onReplySubmitted={load}
            />
          ))}
        </div>
      )}

      {/* New comment form */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        {user && (
          <CommentAvatar
            name={user.fullName ?? user.email}
            role={user.role as "athlete" | "coach" | "admin"}
          />
        )}
        <div style={{ flex: 1 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a coaching comment…"
            rows={2}
            style={{
              width: "100%",
              background: "var(--bg-input)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
              resize: "none",
              outline: "none",
              fontFamily: "Inter, system-ui, sans-serif",
              transition: "border-color var(--duration-micro)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handlePost();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              ⌘ + Enter to send
            </span>
            <button
              onClick={handlePost}
              disabled={!newComment.trim() || posting}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background:
                  newComment.trim() && !posting
                    ? "var(--color-accent)"
                    : "var(--bg-elevated)",
                color:
                  newComment.trim() && !posting ? "white" : "var(--text-muted)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                cursor: newComment.trim() && !posting ? "pointer" : "not-allowed",
                transition: "all var(--duration-micro)",
              }}
            >
              {posting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
