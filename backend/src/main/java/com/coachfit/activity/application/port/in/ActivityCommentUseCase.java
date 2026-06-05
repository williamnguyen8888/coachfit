package com.coachfit.activity.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: activity comment CRUD use cases.
 *
 * <p>Covers:
 * <ul>
 *   <li>{@code GET    /activities/{id}/comments}                 — list comments (threaded)</li>
 *   <li>{@code POST   /activities/{id}/comments}                 — add comment</li>
 *   <li>{@code PUT    /activities/{id}/comments/{commentId}}     — edit own comment</li>
 *   <li>{@code DELETE /activities/{id}/comments/{commentId}}     — soft-delete own comment</li>
 * </ul>
 *
 * <p>Access rules:
 * <ul>
 *   <li>Activity owner can always comment on their own activities.</li>
 *   <li>A coach with {@code readActivities} permission can comment on athlete activities.</li>
 *   <li>Edit / Delete: only the comment author (regardless of role).</li>
 * </ul>
 */
public interface ActivityCommentUseCase {

    /** Returns all non-deleted comments for the activity, ordered by creation time. */
    List<CommentView> listComments(UUID requesterId, UUID activityId);

    /**
     * Adds a new comment.
     *
     * @param requesterId authenticated user posting the comment
     * @param activityId  target activity
     * @param content     comment text (non-blank, max 4000 chars)
     * @param parentId    null for top-level, non-null for threaded reply
     * @return the created comment
     */
    CommentView addComment(UUID requesterId, UUID activityId, String content, UUID parentId);

    /**
     * Edits the content of an existing comment.
     * Only the original author may edit.
     */
    CommentView editComment(UUID requesterId, UUID commentId, String newContent);

    /**
     * Soft-deletes a comment (sets deleted_at).
     * Only the original author may delete, or the activity owner.
     */
    void deleteComment(UUID requesterId, UUID commentId);

    // ── View types ────────────────────────────────────────────────────────────

    record CommentView(
            UUID        id,
            UUID        activityId,
            UUID        parentId,           // null = top-level
            AuthorView  author,
            String      content,
            Instant     createdAt,
            Instant     updatedAt,
            List<CommentView> replies       // populated for top-level comments
    ) {}

    record AuthorView(UUID id, String name, String avatarUrl, String role) {}
}
