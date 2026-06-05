package com.coachfit.activity.adapter.in;

import com.coachfit.activity.application.port.in.ActivityCommentUseCase;
import com.coachfit.activity.application.port.in.ActivityCommentUseCase.CommentView;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for activity comment endpoints.
 *
 * <pre>
 * GET    /api/v1/activities/{activityId}/comments                          — list (threaded)
 * POST   /api/v1/activities/{activityId}/comments                          — add comment
 * PUT    /api/v1/activities/{activityId}/comments/{commentId}              — edit own comment
 * DELETE /api/v1/activities/{activityId}/comments/{commentId}              — delete own comment
 * </pre>
 *
 * <p>Access control: controller relies on the authenticated user having already passed
 * activity-level ownership or coach-permission checks at the service layer.
 * The {@link ActivityCommentUseCase} implementation enforces author-only edit/delete.
 */
@RestController
@RequestMapping("/api/v1/activities/{activityId}/comments")
public class ActivityCommentController {

    private final ActivityCommentUseCase commentUseCase;

    public ActivityCommentController(ActivityCommentUseCase commentUseCase) {
        this.commentUseCase = commentUseCase;
    }

    // ── GET /activities/{activityId}/comments ─────────────────────────────────

    @GetMapping
    public ResponseEntity<List<CommentView>> list(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(commentUseCase.listComments(principal.getUserId(), activityId));
    }

    // ── POST /activities/{activityId}/comments ────────────────────────────────

    @PostMapping
    public ResponseEntity<CommentView> add(
            @PathVariable UUID activityId,
            @Valid @RequestBody AddCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        CommentView created = commentUseCase.addComment(
                principal.getUserId(), activityId, request.content(), request.parentId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ── PUT /activities/{activityId}/comments/{commentId} ─────────────────────

    @PutMapping("/{commentId}")
    public ResponseEntity<CommentView> edit(
            @PathVariable UUID activityId,
            @PathVariable UUID commentId,
            @Valid @RequestBody EditCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        CommentView updated = commentUseCase.editComment(
                principal.getUserId(), commentId, request.content());
        return ResponseEntity.ok(updated);
    }

    // ── DELETE /activities/{activityId}/comments/{commentId} ──────────────────

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID activityId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal UserPrincipal principal) {

        commentUseCase.deleteComment(principal.getUserId(), commentId);
        return ResponseEntity.noContent().build();
    }

    // ── Request records ───────────────────────────────────────────────────────

    record AddCommentRequest(
            @NotBlank @Size(max = 4000) String content,
            UUID parentId   // null = top-level, non-null = reply
    ) {}

    record EditCommentRequest(
            @NotBlank @Size(max = 4000) String content
    ) {}
}
