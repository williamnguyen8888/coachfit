package com.coachfit.coach.adapter.in;

import com.coachfit.coach.application.port.in.CoachAthleteDataUseCase;
import com.coachfit.coach.application.port.in.CoachAthleteDataUseCase.*;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.shared.adapter.in.security.featuregate.RequiresTier;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
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
 * REST controller for coach athlete data access endpoints.
 *
 * <pre>
 * GET /api/v1/coach/athletes/{id}/dashboard
 * GET /api/v1/coach/athletes/{id}/activities
 * GET /api/v1/coach/athletes/{id}/activities/{actId}
 * GET /api/v1/coach/athletes/{id}/activities/{actId}/streams
 * GET /api/v1/coach/athletes/{id}/calendar?from=...&amp;to=...
 * GET /api/v1/coach/athletes/{id}/wellness?from=...&amp;to=...
 * GET /api/v1/coach/athletes/{id}/health/daily?from=...&amp;to=...
 * GET /api/v1/coach/athletes/{id}/training-load/pmc?from=...&amp;to=...
 * GET /api/v1/coach/athletes/{id}/zones
 * </pre>
 *
 * <p>Permission enforcement via {@code @coachAccess.hasAccess(principal, #athleteId, 'perm')}.
 * This guarantees an active relationship with the required flag before the service is called.
 */
@RestController
@RequestMapping("/api/v1/coach/athletes/{athleteId}")
public class CoachAthleteDataController {

    private final CoachAthleteDataUseCase dataUseCase;

    public CoachAthleteDataController(CoachAthleteDataUseCase dataUseCase) {
        this.dataUseCase = dataUseCase;
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'viewProfile')")
    public ResponseEntity<AthleteDashboard> dashboard(
            @PathVariable UUID athleteId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(dataUseCase.getAthleteDashboard(principal.getUserId(), athleteId));
    }

    // ── Activities ────────────────────────────────────────────────────────────

    @GetMapping("/activities")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivities')")
    public ResponseEntity<ActivityPage> activities(
            @PathVariable UUID athleteId,
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size,
            @RequestParam(required = false)    String sport,
            @RequestParam(required = false)    String from,
            @RequestParam(required = false)    String to,
            @AuthenticationPrincipal UserPrincipal principal) {

        int effectiveSize = Math.min(size, 100);
        return ResponseEntity.ok(dataUseCase.getAthleteActivities(
                principal.getUserId(), athleteId, page, effectiveSize, sport, from, to));
    }

    @GetMapping("/activities/{activityId}")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivities')")
    public ResponseEntity<ActivityDetail> activityDetail(
            @PathVariable UUID athleteId,
            @PathVariable UUID activityId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteActivityDetail(principal.getUserId(), athleteId, activityId));
    }

    @GetMapping("/activities/{activityId}/streams")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivityStreams')")
    public ResponseEntity<ActivityStreams> activityStreams(
            @PathVariable UUID athleteId,
            @PathVariable UUID activityId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteActivityStreams(principal.getUserId(), athleteId, activityId));
    }

    // ── Calendar ──────────────────────────────────────────────────────────────

    @GetMapping("/calendar")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivities')")
    public ResponseEntity<List<CalendarEventEntry>> calendar(
            @PathVariable UUID athleteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteCalendar(principal.getUserId(), athleteId, from, to));
    }

    // ── Wellness ──────────────────────────────────────────────────────────────

    @GetMapping("/wellness")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readWellness')")
    public ResponseEntity<WellnessPage> wellness(
            @PathVariable UUID athleteId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteWellness(principal.getUserId(), athleteId, from, to));
    }

    // ── Health ────────────────────────────────────────────────────────────────

    @GetMapping("/health/daily")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readHealthData')")
    public ResponseEntity<HealthDailySummaryPage> healthDaily(
            @PathVariable UUID athleteId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteHealthDaily(principal.getUserId(), athleteId, from, to));
    }

    // ── Training Load / PMC ───────────────────────────────────────────────────

    @GetMapping("/training-load/pmc")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readTrainingLoad')")
    public ResponseEntity<List<PmcPoint>> pmc(
            @PathVariable UUID athleteId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthletePmc(principal.getUserId(), athleteId, from, to));
    }

    // ── Zones ─────────────────────────────────────────────────────────────────

    @GetMapping("/zones")
    @RequiresTier("coach")
    @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'viewZones')")
    public ResponseEntity<List<ZoneEntry>> zones(
            @PathVariable UUID athleteId,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                dataUseCase.getAthleteZones(principal.getUserId(), athleteId));
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(CoachRelationshipNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(CoachRelationshipNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(new ApiError("NOT_FOUND", ex.getMessage())));
    }
}
