package com.coachfit.coach.adapter.in;

import com.coachfit.coach.application.port.in.CoachWorkoutAssignmentUseCase;
import com.coachfit.coach.application.port.in.CoachWorkoutAssignmentUseCase.*;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.shared.adapter.in.security.featuregate.RequiresTier;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for coach workout assignment endpoints.
 *
 * <pre>
 * POST   /api/v1/coach/athletes/{id}/calendar            — assign workout
 * PUT    /api/v1/coach/athletes/{id}/calendar/{eventId}  — update assigned event
 * DELETE /api/v1/coach/athletes/{id}/calendar/{eventId}  — remove assigned event
 * POST   /api/v1/coach/athletes/{id}/workouts            — add to athlete library
 * POST   /api/v1/coach/athletes/bulk-assign              — bulk assign
 * </pre>
 *
 * <p>All endpoints require {@code coach} tier and the {@code writeCalendar} permission
 * for the target athlete.
 */
@RestController
@RequestMapping("/api/v1/coach/athletes")
public class CoachWorkoutAssignmentController {

    private final CoachWorkoutAssignmentUseCase assignmentUseCase;

    public CoachWorkoutAssignmentController(CoachWorkoutAssignmentUseCase assignmentUseCase) {
        this.assignmentUseCase = assignmentUseCase;
    }

    // ── POST /coach/athletes/{id}/calendar ────────────────────────────────────

    @PostMapping("/{athleteId}/calendar")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'writeCalendar')")
    public ResponseEntity<AssignResult> assign(
            @PathVariable UUID athleteId,
            @Valid @RequestBody AssignRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var cmd = new AssignCommand(request.workoutId(), request.date(), request.notes());
        AssignResult result = assignmentUseCase.assign(principal.getUserId(), athleteId, cmd);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // ── PUT /coach/athletes/{id}/calendar/{eventId} ───────────────────────────

    @PutMapping("/{athleteId}/calendar/{eventId}")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'writeCalendar')")
    public ResponseEntity<Void> updateAssignment(
            @PathVariable UUID athleteId,
            @PathVariable UUID eventId,
            @RequestBody UpdateAssignRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var cmd = new UpdateAssignCommand(request.date(), request.notes());
        assignmentUseCase.update(principal.getUserId(), athleteId, eventId, cmd);
        return ResponseEntity.ok().build();
    }

    // ── DELETE /coach/athletes/{id}/calendar/{eventId} ────────────────────────

    @DeleteMapping("/{athleteId}/calendar/{eventId}")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'writeCalendar')")
    public ResponseEntity<Void> removeAssignment(
            @PathVariable UUID athleteId,
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {

        assignmentUseCase.remove(principal.getUserId(), athleteId, eventId);
        return ResponseEntity.noContent().build();
    }

    // ── POST /coach/athletes/{id}/workouts ────────────────────────────────────

    @PostMapping("/{athleteId}/workouts")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'writeCalendar')")
    public ResponseEntity<AddWorkoutResult> addWorkoutToLibrary(
            @PathVariable UUID athleteId,
            @Valid @RequestBody AddWorkoutRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID newId = assignmentUseCase.addWorkoutToAthleteLibrary(
                principal.getUserId(), athleteId, request.workoutId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AddWorkoutResult(newId));
    }

    // ── POST /coach/athletes/bulk-assign ──────────────────────────────────────

    @PostMapping("/bulk-assign")
    @RequiresTier("coach")
    @PreAuthorize("hasRole('ROLE_COACH')")
    public ResponseEntity<BulkAssignResult> bulkAssign(
            @Valid @RequestBody BulkAssignRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var cmd = new BulkAssignCommand(
                request.athleteIds(), request.workoutId(), request.date(), request.notes());
        BulkAssignResult result = assignmentUseCase.bulkAssign(principal.getUserId(), cmd);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(CoachRelationshipNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(CoachRelationshipNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }

    // ── Request / response records ────────────────────────────────────────────

    record AssignRequest(
            @NotNull UUID      workoutId,
            @NotNull LocalDate date,
            String             notes
    ) {}

    record UpdateAssignRequest(
            LocalDate date,
            String    notes
    ) {}

    record AddWorkoutRequest(@NotNull UUID workoutId) {}

    record AddWorkoutResult(UUID workoutId) {}

    record BulkAssignRequest(
            @NotNull List<UUID> athleteIds,
            @NotNull UUID       workoutId,
            @NotNull LocalDate  date,
            String              notes
    ) {}
}
