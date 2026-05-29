package com.coachfit.workout.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.workout.adapter.in.dto.WorkoutDetailResponse;
import com.coachfit.workout.adapter.in.dto.WorkoutListResponse;
import com.coachfit.workout.adapter.in.dto.WorkoutRequest;
import com.coachfit.workout.adapter.in.dto.WorkoutTemplateListResponse;
import com.coachfit.workout.application.port.in.CreateWorkoutUseCase;
import com.coachfit.workout.application.port.in.CreateWorkoutUseCase.CreateCommand;
import com.coachfit.workout.application.port.in.DeleteWorkoutUseCase;
import com.coachfit.workout.application.port.in.GetWorkoutUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase.WorkoutQuery;
import com.coachfit.workout.application.port.in.UpdateWorkoutUseCase;
import com.coachfit.workout.application.port.in.UpdateWorkoutUseCase.UpdateCommand;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.UUID;

/**
 * REST controller for the workout module endpoints.
 *
 * <pre>
 * GET    /api/v1/workouts               — paginated user library
 * GET    /api/v1/workouts/templates     — public / system templates
 * GET    /api/v1/workouts/{id}          — full detail (steps included)
 * POST   /api/v1/workouts               — create a new workout
 * PUT    /api/v1/workouts/{id}          — full replacement update
 * DELETE /api/v1/workouts/{id}          — soft delete
 * </pre>
 *
 * <p>All endpoints except {@code GET /workouts/templates} require authentication.
 * Ownership is enforced in the use-case layer — users can only access/mutate
 * their own workouts (or public/system templates on reads).
 *
 * <p>The {@code steps} field is a raw JSON array passed through verbatim to
 * JSONB storage, preserving compatibility with a future FIT export pipeline.
 *
 * <p>No calendar logic is implemented here; see the calendar module.
 */
@RestController
@RequestMapping("/api/v1/workouts")
public class WorkoutController {

    private final ListWorkoutsUseCase         listUseCase;
    private final GetWorkoutUseCase           getUseCase;
    private final CreateWorkoutUseCase        createUseCase;
    private final UpdateWorkoutUseCase        updateUseCase;
    private final DeleteWorkoutUseCase        deleteUseCase;
    private final ListWorkoutTemplatesUseCase templatesUseCase;

    public WorkoutController(ListWorkoutsUseCase listUseCase,
                             GetWorkoutUseCase getUseCase,
                             CreateWorkoutUseCase createUseCase,
                             UpdateWorkoutUseCase updateUseCase,
                             DeleteWorkoutUseCase deleteUseCase,
                             ListWorkoutTemplatesUseCase templatesUseCase) {
        this.listUseCase      = listUseCase;
        this.getUseCase       = getUseCase;
        this.createUseCase    = createUseCase;
        this.updateUseCase    = updateUseCase;
        this.deleteUseCase    = deleteUseCase;
        this.templatesUseCase = templatesUseCase;
    }

    // ── GET /workouts/templates ───────────────────────────────────────────────

    /**
     * Returns paginated public/system workout templates.
     * Accessible without authentication (open endpoint).
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code sport}  — optional sport filter (e.g. "cycling", "running")</li>
     *   <li>{@code page}   — 0-indexed page (default 0)</li>
     *   <li>{@code size}   — page size (default 20, max 100)</li>
     * </ul>
     *
     * <p><strong>Important:</strong> this path must be declared before the
     * {@code /{id}} mapping so Spring MVC does not try to parse "templates"
     * as a UUID.
     */
    @GetMapping("/templates")
    public ResponseEntity<WorkoutTemplateListResponse> listTemplates(
            @RequestParam(required = false) String sport,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100);
        return ResponseEntity.ok(
                WorkoutTemplateListResponse.from(templatesUseCase.listTemplates(sport, page, size)));
    }

    // ── GET /workouts ─────────────────────────────────────────────────────────

    /**
     * Returns the authenticated user's workout library (paginated).
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code sport}      — optional sport filter</li>
     *   <li>{@code isTemplate} — optional boolean filter (true = templates only)</li>
     *   <li>{@code page}       — 0-indexed page (default 0)</li>
     *   <li>{@code size}       — page size (default 20, max 100)</li>
     * </ul>
     */
    @GetMapping
    public ResponseEntity<WorkoutListResponse> list(
            @RequestParam(required = false) String  sport,
            @RequestParam(required = false) Boolean isTemplate,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        size = Math.min(size, 100);
        WorkoutQuery query = new WorkoutQuery(sport, isTemplate, page, size);
        return ResponseEntity.ok(
                WorkoutListResponse.from(listUseCase.list(principal.getUserId(), query)));
    }

    // ── GET /workouts/{id} ────────────────────────────────────────────────────

    /**
     * Returns the full detail of a single workout, including its {@code steps} JSON.
     * Accessible if the workout belongs to the user or is a public/system template.
     */
    @GetMapping("/{id}")
    public ResponseEntity<WorkoutDetailResponse> get(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                WorkoutDetailResponse.from(getUseCase.get(principal.getUserId(), id)));
    }

    // ── POST /workouts ────────────────────────────────────────────────────────

    /**
     * Creates a new workout in the user's library.
     *
     * <p>Validation:
     * <ul>
     *   <li>{@code name} and {@code sport} are required.</li>
     *   <li>{@code steps} must be a valid JSON array conforming to the workout data model.</li>
     * </ul>
     * Returns 201 with a {@code Location} header pointing to the created resource.
     */
    @PostMapping
    public ResponseEntity<WorkoutDetailResponse> create(
            @RequestBody WorkoutRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        validateRequestFields(req);

        UUID id = createUseCase.create(
                principal.getUserId(),
                new CreateCommand(
                        req.name(), req.sport(), req.description(), req.steps(),
                        req.tags(),
                        req.isTemplate() != null && req.isTemplate(),
                        req.isPublic()   != null && req.isPublic(),
                        req.estimatedDurationSeconds(), req.estimatedTss()
                ));

        WorkoutDetailResponse body = WorkoutDetailResponse.from(
                getUseCase.get(principal.getUserId(), id));

        return ResponseEntity
                .created(URI.create("/api/v1/workouts/" + id))
                .body(body);
    }

    // ── PUT /workouts/{id} ────────────────────────────────────────────────────

    /**
     * Fully replaces an existing workout.
     * Only the owning user may update their workout.
     * Returns 200 with the updated detail.
     */
    @PutMapping("/{id}")
    public ResponseEntity<WorkoutDetailResponse> update(
            @PathVariable UUID id,
            @RequestBody WorkoutRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        validateRequestFields(req);

        updateUseCase.update(
                principal.getUserId(), id,
                new UpdateCommand(
                        req.name(), req.sport(), req.description(), req.steps(),
                        req.tags(),
                        req.isTemplate() != null && req.isTemplate(),
                        req.isPublic()   != null && req.isPublic(),
                        req.estimatedDurationSeconds(), req.estimatedTss()
                ));

        return ResponseEntity.ok(
                WorkoutDetailResponse.from(getUseCase.get(principal.getUserId(), id)));
    }

    // ── DELETE /workouts/{id} ─────────────────────────────────────────────────

    /**
     * Soft-deletes a workout (sets {@code deleted_at = now()}).
     * Returns 204 No Content on success.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        deleteUseCase.delete(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Basic field-level validation before the use-case validator runs structural
     * checks on the steps JSON.
     */
    private static void validateRequestFields(WorkoutRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (req.name().length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name must not exceed 255 characters");
        }
        if (req.sport() == null || req.sport().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sport is required");
        }
        if (req.steps() == null || req.steps().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "steps is required");
        }
    }
}
