package com.coachfit.activity.application.service;

import com.coachfit.activity.application.port.in.ActivityCommentUseCase;
import com.coachfit.activity.application.port.out.ActivityCommentPersistencePort;
import com.coachfit.activity.application.port.out.ActivityNotificationPort;
import com.coachfit.activity.application.port.out.ActivityUserQueryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Application service implementing {@link ActivityCommentUseCase}.
 *
 * <p>Access rules enforced here (after controller-level authentication):
 * <ul>
 *   <li>Anyone who can GET an activity (owner or coach with readActivities) may list comments.</li>
 *   <li>Same users may POST a comment.</li>
 *   <li>Only the comment author may edit their own comment.</li>
 *   <li>The comment author OR the activity owner may delete a comment.</li>
 * </ul>
 *
 * <p>When a comment is added, a {@code comment_added} notification is sent to the
 * activity owner (unless the owner is the commenter).
 */
@Service
@Transactional
public class ActivityCommentService implements ActivityCommentUseCase {

    private static final Logger log = LoggerFactory.getLogger(ActivityCommentService.class);

    private static final int MAX_CONTENT_LENGTH = 4000;

    private final ActivityCommentPersistencePort commentPort;
    private final ActivityUserQueryPort          userQuery;
    private final ActivityNotificationPort       notificationPort;

    public ActivityCommentService(ActivityCommentPersistencePort commentPort,
                                  ActivityUserQueryPort userQuery,
                                  ActivityNotificationPort notificationPort) {
        this.commentPort      = commentPort;
        this.userQuery        = userQuery;
        this.notificationPort = notificationPort;
    }

    // ── listComments ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<CommentView> listComments(UUID requesterId, UUID activityId) {
        // Access: if called, controller already verified the requester can see the activity
        List<ActivityCommentPersistencePort.CommentRow> rows = commentPort.findByActivity(activityId);

        // Resolve unique author IDs
        Set<UUID> authorIds = rows.stream()
                .map(ActivityCommentPersistencePort.CommentRow::userId)
                .collect(Collectors.toSet());

        Map<UUID, AuthorView> authors = new HashMap<>();
        for (UUID id : authorIds) {
            userQuery.findById(id).ifPresent(u ->
                    authors.put(id, new AuthorView(u.id(), u.fullName(), u.avatarUrl(), u.role())));
        }

        // Build threaded tree: top-level comments with their replies
        Map<UUID, List<ActivityCommentPersistencePort.CommentRow>> byParent = rows.stream()
                .filter(r -> r.parentId() != null)
                .collect(Collectors.groupingBy(ActivityCommentPersistencePort.CommentRow::parentId));

        return rows.stream()
                .filter(r -> r.parentId() == null)
                .map(r -> toView(r, authors, byParent))
                .toList();
    }

    // ── addComment ────────────────────────────────────────────────────────────

    @Override
    public CommentView addComment(UUID requesterId, UUID activityId,
                                  String content, UUID parentId) {
        validateContent(content);

        // Validate parent exists if provided
        if (parentId != null) {
            commentPort.findById(parentId)
                    .filter(c -> c.activityId().equals(activityId))
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Parent comment not found on this activity"));
        }

        ActivityCommentPersistencePort.CommentRow saved =
                commentPort.save(activityId, requesterId, parentId, content);

        // Notify activity owner (if different from commenter)
        commentPort.findActivityOwner(activityId).ifPresent(ownerId -> {
            if (!ownerId.equals(requesterId)) {
                ActivityUserQueryPort.UserRow commenter =
                        userQuery.findById(requesterId).orElse(null);
                String commenterName = commenter != null ? commenter.fullName() : "Someone";

                notificationPort.send(
                        ownerId,
                        "comment_added",
                        commenterName + " commented on your activity",
                        content.length() > 100 ? content.substring(0, 97) + "..." : content,
                        Map.of("activityId",  activityId.toString(),
                               "commentId",   saved.id().toString(),
                               "authorId",    requesterId.toString())
                );
            }
        });

        log.info("Comment added: id={} activityId={} userId={}", saved.id(), activityId, requesterId);

        ActivityUserQueryPort.UserRow author = userQuery.findById(requesterId).orElse(null);
        AuthorView authorView = author != null
                ? new AuthorView(author.id(), author.fullName(), author.avatarUrl(), author.role())
                : new AuthorView(requesterId, "Unknown", null, "athlete");

        return new CommentView(saved.id(), activityId, parentId,
                authorView, content, saved.createdAt(), saved.updatedAt(), List.of());
    }

    // ── editComment ───────────────────────────────────────────────────────────

    @Override
    public CommentView editComment(UUID requesterId, UUID commentId, String newContent) {
        validateContent(newContent);

        ActivityCommentPersistencePort.CommentRow existing =
                commentPort.findById(commentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Comment not found"));

        if (existing.deletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        if (!existing.userId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only edit your own comments");
        }

        boolean updated = commentPort.updateContent(commentId, requesterId, newContent);
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Edit failed");
        }

        ActivityUserQueryPort.UserRow author = userQuery.findById(requesterId).orElse(null);
        AuthorView authorView = author != null
                ? new AuthorView(author.id(), author.fullName(), author.avatarUrl(), author.role())
                : new AuthorView(requesterId, "Unknown", null, "athlete");

        return new CommentView(commentId, existing.activityId(), existing.parentId(),
                authorView, newContent, existing.createdAt(), java.time.Instant.now(), List.of());
    }

    // ── deleteComment ─────────────────────────────────────────────────────────

    @Override
    public void deleteComment(UUID requesterId, UUID commentId) {
        ActivityCommentPersistencePort.CommentRow existing =
                commentPort.findById(commentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Comment not found"));

        if (existing.deletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }

        // Allow: comment author OR activity owner
        boolean isAuthor = existing.userId().equals(requesterId);
        boolean isOwner  = commentPort.findActivityOwner(existing.activityId())
                .map(ownerId -> ownerId.equals(requesterId))
                .orElse(false);

        if (!isAuthor && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have permission to delete this comment");
        }

        commentPort.softDelete(commentId, requesterId);
        log.info("Comment deleted: id={} by userId={}", commentId, requesterId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content is required");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Comment must not exceed " + MAX_CONTENT_LENGTH + " characters");
        }
    }

    private CommentView toView(
            ActivityCommentPersistencePort.CommentRow r,
            Map<UUID, AuthorView> authors,
            Map<UUID, List<ActivityCommentPersistencePort.CommentRow>> byParent) {

        AuthorView author = authors.getOrDefault(r.userId(),
                new AuthorView(r.userId(), "Unknown", null, "athlete"));

        List<CommentView> replies = byParent.getOrDefault(r.id(), List.of()).stream()
                .map(reply -> toView(reply, authors, Map.of()))  // replies don't nest further
                .toList();

        return new CommentView(r.id(), r.activityId(), r.parentId(),
                author, r.content(), r.createdAt(), r.updatedAt(), replies);
    }
}
