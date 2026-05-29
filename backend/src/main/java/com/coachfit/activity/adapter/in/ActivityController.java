package com.coachfit.activity.adapter.in;

import com.coachfit.activity.adapter.in.dto.ActivityDetailResponse;
import com.coachfit.activity.adapter.in.dto.ActivityDownloadResponse;
import com.coachfit.activity.adapter.in.dto.ActivityLapsResponse;
import com.coachfit.activity.adapter.in.dto.ActivityListResponse;
import com.coachfit.activity.adapter.in.dto.ActivityStreamsResponse;
import com.coachfit.activity.adapter.in.dto.ActivityUpdateRequest;
import com.coachfit.activity.application.port.in.DeleteActivityUseCase;
import com.coachfit.activity.application.port.in.DownloadActivityUseCase;
import com.coachfit.activity.application.port.in.GetActivityLapsUseCase;
import com.coachfit.activity.application.port.in.GetActivityStreamsUseCase;
import com.coachfit.activity.application.port.in.GetActivityUseCase;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase;
import com.coachfit.activity.application.port.in.ListActivitiesUseCase.ActivityQuery;
import com.coachfit.activity.application.port.in.UpdateActivityUseCase;
import com.coachfit.activity.application.port.in.UpdateActivityUseCase.UpdateCommand;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * REST controller for activity read / update / delete endpoints.
 *
 * <pre>
 * GET    /api/v1/activities                   — paginated, filterable list
 * GET    /api/v1/activities/{id}              — full detail
 * GET    /api/v1/activities/{id}/streams      — time-series data
 * GET    /api/v1/activities/{id}/laps         — lap summaries
 * PUT    /api/v1/activities/{id}              — update name / description / gear
 * DELETE /api/v1/activities/{id}              — soft delete
 * GET    /api/v1/activities/{id}/download     — pre-signed download URL
 * </pre>
 *
 * <p>Authentication is enforced by the JWT filter chain configured in
 * {@code SecurityConfig}. Every use case receives the authenticated user's UUID
 * from {@link UserPrincipal}, ensuring strict ownership isolation.
 *
 * <p>File upload ({@code POST /activities/upload}) is handled by
 * {@link ActivityUploadController}.
 */
@RestController
@RequestMapping("/api/v1/activities")
public class ActivityController {

    private final ListActivitiesUseCase   listUseCase;
    private final GetActivityUseCase      getUseCase;
    private final GetActivityStreamsUseCase streamsUseCase;
    private final GetActivityLapsUseCase  lapsUseCase;
    private final UpdateActivityUseCase   updateUseCase;
    private final DeleteActivityUseCase   deleteUseCase;
    private final DownloadActivityUseCase downloadUseCase;

    public ActivityController(ListActivitiesUseCase listUseCase,
                              GetActivityUseCase getUseCase,
                              GetActivityStreamsUseCase streamsUseCase,
                              GetActivityLapsUseCase lapsUseCase,
                              UpdateActivityUseCase updateUseCase,
                              DeleteActivityUseCase deleteUseCase,
                              DownloadActivityUseCase downloadUseCase) {
        this.listUseCase     = listUseCase;
        this.getUseCase      = getUseCase;
        this.streamsUseCase  = streamsUseCase;
        this.lapsUseCase     = lapsUseCase;
        this.updateUseCase   = updateUseCase;
        this.deleteUseCase   = deleteUseCase;
        this.downloadUseCase = downloadUseCase;
    }

    // ── GET /activities ───────────────────────────────────────────────────────

    /**
     * Lists the authenticated user's activities.
     *
     * <p>Query parameters (all optional):
     * <ul>
     *   <li>{@code sport}   — filter by sport (e.g. "cycling", "running")</li>
     *   <li>{@code source}  — filter by source (e.g. "strava", "garmin", "manual")</li>
     *   <li>{@code from}    — ISO date lower bound (inclusive) e.g. "2025-01-01"</li>
     *   <li>{@code to}      — ISO date upper bound (inclusive)</li>
     *   <li>{@code page}    — 0-indexed page (default 0)</li>
     *   <li>{@code size}    — page size (default 20, max 100)</li>
     *   <li>{@code sort}    — field,direction e.g. "startedAt,desc" (default)</li>
     * </ul>
     */
    @GetMapping
    public ResponseEntity<ActivityListResponse> list(
            @RequestParam(required = false) String sport,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "startedAt,desc") String sort,
            @AuthenticationPrincipal UserPrincipal principal) {

        size = Math.min(size, 100);

        String[] sortParts = parseSortParam(sort);

        ActivityQuery query = new ActivityQuery(
                sport, source,
                from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : null,
                to   != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null,
                page, size,
                sortParts[0], sortParts[1]
        );

        return ResponseEntity.ok(
                ActivityListResponse.from(listUseCase.list(principal.getUserId(), query)));
    }

    // ── GET /activities/{id} ──────────────────────────────────────────────────

    /**
     * Returns the full detail of a single activity.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ActivityDetailResponse> get(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                ActivityDetailResponse.from(getUseCase.get(principal.getUserId(), id)));
    }

    // ── GET /activities/{id}/streams ──────────────────────────────────────────

    /**
     * Returns the time-series stream data for an activity.
     * Returns 404 if the activity has no recorded streams.
     */
    @GetMapping("/{id}/streams")
    public ResponseEntity<ActivityStreamsResponse> getStreams(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                ActivityStreamsResponse.from(streamsUseCase.getStreams(principal.getUserId(), id)));
    }

    // ── GET /activities/{id}/laps ─────────────────────────────────────────────

    /**
     * Returns the ordered list of laps for an activity.
     * Returns an empty list if no laps were recorded.
     */
    @GetMapping("/{id}/laps")
    public ResponseEntity<ActivityLapsResponse> getLaps(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                ActivityLapsResponse.from(lapsUseCase.getLaps(principal.getUserId(), id)));
    }

    // ── PUT /activities/{id} ──────────────────────────────────────────────────

    /**
     * Updates editable fields of an activity (name, description, gearId).
     * Null fields in the request body leave the persisted value unchanged.
     * Returns 200 with the updated activity detail.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ActivityDetailResponse> update(
            @PathVariable UUID id,
            @RequestBody ActivityUpdateRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        updateUseCase.update(
                principal.getUserId(), id,
                new UpdateCommand(req.name(), req.description(), req.gearId()));

        // Re-fetch and return the updated detail (consistent with REST conventions)
        return ResponseEntity.ok(
                ActivityDetailResponse.from(getUseCase.get(principal.getUserId(), id)));
    }

    // ── DELETE /activities/{id} ───────────────────────────────────────────────

    /**
     * Soft-deletes an activity (sets {@code deleted_at = now()}).
     * Returns 204 No Content on success.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        deleteUseCase.delete(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    // ── GET /activities/{id}/download ─────────────────────────────────────────

    /**
     * Returns a short-lived pre-signed URL for downloading the original activity file.
     * Returns 404 if the activity was not created from a file upload.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<ActivityDownloadResponse> download(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                ActivityDownloadResponse.from(downloadUseCase.getDownloadUrl(principal.getUserId(), id)));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Parses the {@code sort} query parameter in the format {@code field[,direction]}.
     *
     * <p>Examples: {@code "startedAt,desc"}, {@code "tss"} (direction defaults to "desc").
     *
     * @return {@code [field, direction]} — direction is always "asc" or "desc"
     */
    private static String[] parseSortParam(String sort) {
        if (sort == null || sort.isBlank()) return new String[]{"startedAt", "desc"};
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim();
        String dir   = parts.length > 1 ? parts[1].trim().toLowerCase() : "desc";
        if (!"asc".equals(dir) && !"desc".equals(dir)) dir = "desc";
        return new String[]{field, dir};
    }
}
