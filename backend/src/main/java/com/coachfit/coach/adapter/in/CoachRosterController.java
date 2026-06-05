package com.coachfit.coach.adapter.in;

import com.coachfit.coach.adapter.in.dto.CoachRosterResponse;
import com.coachfit.coach.application.port.in.*;
import com.coachfit.coach.domain.exception.AthleteAlreadyConnectedException;
import com.coachfit.coach.domain.exception.AthleteCapacityExceededException;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.shared.adapter.in.security.featuregate.RequiresTier;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for coach roster management endpoints.
 *
 * <pre>
 * GET    /api/v1/coach/athletes                        — list roster
 * POST   /api/v1/coach/athletes/invite                 — invite athlete by email
 * DELETE /api/v1/coach/athletes/{athleteId}             — remove athlete
 * PUT    /api/v1/coach/athletes/{athleteId}/tags        — update tags
 * PUT    /api/v1/coach/athletes/{athleteId}/nickname    — update nickname
 * PUT    /api/v1/coach/athletes/{athleteId}/notes       — update notes
 * </pre>
 *
 * <p>All endpoints require the {@code coach} subscription tier and {@code ROLE_COACH} role.
 */
@RestController
@RequestMapping("/api/v1/coach/athletes")
public class CoachRosterController {

    private final GetCoachRosterUseCase      rosterUseCase;
    private final InviteAthleteUseCase       inviteUseCase;
    private final RevokeCoachAthleteUseCase  revokeUseCase;
    private final UpdateAthleteMetaUseCase   metaUseCase;

    public CoachRosterController(GetCoachRosterUseCase rosterUseCase,
                                 InviteAthleteUseCase inviteUseCase,
                                 RevokeCoachAthleteUseCase revokeUseCase,
                                 UpdateAthleteMetaUseCase metaUseCase) {
        this.rosterUseCase  = rosterUseCase;
        this.inviteUseCase  = inviteUseCase;
        this.revokeUseCase  = revokeUseCase;
        this.metaUseCase    = metaUseCase;
    }

    // ── GET /coach/athletes ───────────────────────────────────────────────────

    /**
     * Returns the coach's athlete roster (active relationships only), paginated.
     */
    @GetMapping
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<CoachRosterResponse.PageResponse> getRoster(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        int effectiveSize = Math.min(size, 100);
        var result = rosterUseCase.getRoster(principal.getUserId(), page, effectiveSize);
        return ResponseEntity.ok(CoachRosterResponse.PageResponse.from(result));
    }

    // ── POST /coach/athletes/invite ───────────────────────────────────────────

    /**
     * Invites an athlete by email. Creates a pending relationship and sends an invite email.
     * Requires {@code Idempotency-Key} header to prevent duplicate invites on retry.
     */
    @PostMapping("/invite")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<?> invite(
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var cmd = new InviteAthleteUseCase.InviteCommand(
                request.email(), request.nickname(), request.tags());

        var ref = inviteUseCase.invite(principal.getUserId(), cmd);

        return ResponseEntity.status(HttpStatus.CREATED).body(ref);
    }

    // ── DELETE /coach/athletes/{athleteId} ────────────────────────────────────

    /**
     * Coach removes an athlete from their roster (status → revoked).
     */
    @DeleteMapping("/{athleteId}")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<Void> removeAthlete(
            @PathVariable UUID athleteId,
            @AuthenticationPrincipal UserPrincipal principal) {

        revokeUseCase.revokeByCoach(principal.getUserId(), athleteId);
        return ResponseEntity.noContent().build();
    }

    // ── PUT /coach/athletes/{athleteId}/tags ──────────────────────────────────

    @PutMapping("/{athleteId}/tags")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<Void> updateTags(
            @PathVariable UUID athleteId,
            @RequestBody TagsRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        metaUseCase.updateMeta(principal.getUserId(), athleteId,
                new UpdateAthleteMetaUseCase.UpdateMetaCommand(null, null, request.tags()));
        return ResponseEntity.ok().build();
    }

    // ── PUT /coach/athletes/{athleteId}/nickname ──────────────────────────────

    @PutMapping("/{athleteId}/nickname")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<Void> updateNickname(
            @PathVariable UUID athleteId,
            @RequestBody NicknameRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        metaUseCase.updateMeta(principal.getUserId(), athleteId,
                new UpdateAthleteMetaUseCase.UpdateMetaCommand(request.nickname(), null, null));
        return ResponseEntity.ok().build();
    }

    // ── PUT /coach/athletes/{athleteId}/notes ─────────────────────────────────

    @PutMapping("/{athleteId}/notes")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<Void> updateNotes(
            @PathVariable UUID athleteId,
            @RequestBody NotesRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        metaUseCase.updateMeta(principal.getUserId(), athleteId,
                new UpdateAthleteMetaUseCase.UpdateMetaCommand(null, request.notes(), null));
        return ResponseEntity.ok().build();
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(AthleteAlreadyConnectedException.class)
    public ResponseEntity<ApiErrorResponse> handleAlreadyConnected(AthleteAlreadyConnectedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(new ApiError("ALREADY_CONNECTED", ex.getMessage())));
    }

    @ExceptionHandler(AthleteCapacityExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleCapacityExceeded(AthleteCapacityExceededException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(new ApiError("ROSTER_CAPACITY_EXCEEDED", ex.getMessage())));
    }

    @ExceptionHandler(CoachRelationshipNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(CoachRelationshipNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }

    // ── Request records ───────────────────────────────────────────────────────

    record InviteRequest(
            @NotBlank String  email,
            String            nickname,
            List<String>      tags
    ) {}

    record TagsRequest(List<String> tags) {}

    record NicknameRequest(String nickname) {}

    record NotesRequest(String notes) {}
}
