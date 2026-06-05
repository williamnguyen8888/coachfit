package com.coachfit.coach.adapter.in;

import com.coachfit.coach.adapter.in.dto.AthleteCoachResponse;
import com.coachfit.coach.application.port.in.GetAthleteCoachInfoUseCase;
import com.coachfit.coach.application.port.in.RevokeCoachAthleteUseCase;
import com.coachfit.coach.application.port.in.UpdateCoachPermissionsUseCase;
import com.coachfit.coach.application.port.out.CoachUserQueryPort;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.coach.domain.model.CoachAthlete;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the athlete-side coach management endpoints.
 *
 * <pre>
 * GET    /api/v1/athlete/coach              — get current coach info
 * PUT    /api/v1/athlete/coach/permissions  — update permission flags for coach
 * DELETE /api/v1/athlete/coach              — revoke coach access
 * </pre>
 *
 * <p>Available to any authenticated user (no coach tier required on the athlete's side).
 */
@RestController
@RequestMapping("/api/v1/athlete/coach")
public class AthleteCoachController {

    private final GetAthleteCoachInfoUseCase    coachInfoUseCase;
    private final UpdateCoachPermissionsUseCase permissionsUseCase;
    private final RevokeCoachAthleteUseCase     revokeUseCase;
    private final CoachUserQueryPort            userQuery;

    public AthleteCoachController(GetAthleteCoachInfoUseCase coachInfoUseCase,
                                  UpdateCoachPermissionsUseCase permissionsUseCase,
                                  RevokeCoachAthleteUseCase revokeUseCase,
                                  CoachUserQueryPort userQuery) {
        this.coachInfoUseCase  = coachInfoUseCase;
        this.permissionsUseCase = permissionsUseCase;
        this.revokeUseCase     = revokeUseCase;
        this.userQuery         = userQuery;
    }

    // ── GET /athlete/coach ────────────────────────────────────────────────────

    /**
     * Returns the athlete's current coach relationship, or 404 if none.
     */
    @GetMapping
    public ResponseEntity<?> getCoachInfo(
            @AuthenticationPrincipal UserPrincipal principal) {

        CoachAthlete rel = coachInfoUseCase.getCoachInfo(principal.getUserId());
        if (rel == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiErrorResponse(new ApiError("NO_COACH", "You have no active coach.")));
        }

        String coachName = userQuery.findUserById(rel.coachUserId())
                .map(CoachUserQueryPort.UserRow::fullName)
                .orElse("Unknown Coach");

        return ResponseEntity.ok(AthleteCoachResponse.from(rel, coachName));
    }

    // ── PUT /athlete/coach/permissions ────────────────────────────────────────

    /**
     * Athlete updates per-permission flags for their coach.
     * Request body: partial map of {@code {permissionKey: true|false}}.
     * Unknown keys are silently ignored.
     */
    @PutMapping("/permissions")
    public ResponseEntity<Void> updatePermissions(
            @RequestBody Map<String, Boolean> permissions,
            @AuthenticationPrincipal UserPrincipal principal) {

        permissionsUseCase.updatePermissions(principal.getUserId(), permissions);
        return ResponseEntity.ok().build();
    }

    // ── DELETE /athlete/coach ─────────────────────────────────────────────────

    /**
     * Athlete removes their coach (status → revoked, access lost immediately).
     */
    @DeleteMapping
    public ResponseEntity<Void> revokeCoach(
            @AuthenticationPrincipal UserPrincipal principal) {

        revokeUseCase.revokeByAthlete(principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(CoachRelationshipNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(CoachRelationshipNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }
}
