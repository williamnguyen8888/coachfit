package com.coachfit.coach.adapter.in;

import com.coachfit.coach.adapter.in.dto.InviteLinkResponse;
import com.coachfit.coach.application.port.in.ManageInviteLinksUseCase;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.shared.adapter.in.security.featuregate.RequiresTier;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for coach invite link management.
 *
 * <pre>
 * GET    /api/v1/coach/invite-links        — list all links (including inactive)
 * POST   /api/v1/coach/invite-links        — create new link
 * DELETE /api/v1/coach/invite-links/{id}   — deactivate link
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/coach/invite-links")
public class CoachInviteLinkController {

    private final ManageInviteLinksUseCase manageLinksUseCase;

    public CoachInviteLinkController(ManageInviteLinksUseCase manageLinksUseCase) {
        this.manageLinksUseCase = manageLinksUseCase;
    }

    // ── GET /coach/invite-links ───────────────────────────────────────────────

    @GetMapping
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<List<InviteLinkResponse>> listLinks(
            @AuthenticationPrincipal UserPrincipal principal) {

        var links = manageLinksUseCase.listLinks(principal.getUserId())
                .stream()
                .map(InviteLinkResponse::from)
                .toList();
        return ResponseEntity.ok(links);
    }

    // ── POST /coach/invite-links ──────────────────────────────────────────────

    /**
     * Creates a new invite link.
     * Example request: {@code { "isReusable": true, "maxUses": 20, "expiresInDays": 30 }}
     */
    @PostMapping
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<InviteLinkResponse> createLink(
            @RequestBody CreateLinkRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var cmd = new ManageInviteLinksUseCase.CreateLinkCommand(
                request.isReusable() != null && request.isReusable(),
                request.maxUses(),
                request.expiresInDays()
        );

        var link = manageLinksUseCase.createLink(principal.getUserId(), cmd);
        return ResponseEntity.status(HttpStatus.CREATED).body(InviteLinkResponse.from(link));
    }

    // ── DELETE /coach/invite-links/{id} ──────────────────────────────────────

    @DeleteMapping("/{id}")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<Void> deactivateLink(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        manageLinksUseCase.deactivateLink(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(CoachRelationshipNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(CoachRelationshipNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }

    // ── Request record ────────────────────────────────────────────────────────

    record CreateLinkRequest(
            Boolean isReusable,
            Integer maxUses,
            Integer expiresInDays
    ) {}
}
