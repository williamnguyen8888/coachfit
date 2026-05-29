package com.coachfit.workout.application.service;

import com.coachfit.workout.application.port.in.CreateWorkoutUseCase;
import com.coachfit.workout.application.port.in.DeleteWorkoutUseCase;
import com.coachfit.workout.application.port.in.GetWorkoutUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase;
import com.coachfit.workout.application.port.in.UpdateWorkoutUseCase;
import com.coachfit.workout.application.port.out.WorkoutPersistencePort;
import com.coachfit.workout.domain.WorkoutStepsValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Application service implementing all workout use cases.
 *
 * <p>Ownership is always enforced: every mutating query includes
 * {@code user_id = :userId} so a user can never modify another user's workouts.
 *
 * <p>Separation of concerns:
 * <ul>
 *   <li>Read queries (list, get, templates) — no transaction needed.</li>
 *   <li>Writes (create, update, delete) — transactional.</li>
 * </ul>
 */
@Service
public class WorkoutService
        implements ListWorkoutsUseCase,
                   GetWorkoutUseCase,
                   CreateWorkoutUseCase,
                   UpdateWorkoutUseCase,
                   DeleteWorkoutUseCase,
                   ListWorkoutTemplatesUseCase {

    private static final Logger log = LoggerFactory.getLogger(WorkoutService.class);

    private final WorkoutPersistencePort port;
    private final WorkoutStepsValidator  validator;

    public WorkoutService(WorkoutPersistencePort port, WorkoutStepsValidator validator) {
        this.port      = port;
        this.validator = validator;
    }

    // ── ListWorkoutsUseCase ───────────────────────────────────────────────────

    @Override
    public WorkoutPage list(UUID userId, WorkoutQuery query) {
        long total = port.count(userId, query.sport(), query.isTemplate());
        int totalPages = query.size() > 0
                ? (int) Math.ceil((double) total / query.size()) : 0;

        List<WorkoutListItem> content = port.list(
                userId, query.sport(), query.isTemplate(), query.page(), query.size());

        return new WorkoutPage(content, query.page(), query.size(), total, totalPages);
    }

    // ── GetWorkoutUseCase ─────────────────────────────────────────────────────

    @Override
    public WorkoutDetail get(UUID userId, UUID workoutId) {
        return port.findDetailById(userId, workoutId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Workout not found"));
    }

    // ── CreateWorkoutUseCase ──────────────────────────────────────────────────

    @Override
    @Transactional
    public UUID create(UUID userId, CreateCommand command) {
        validator.validate(command.stepsJson());

        UUID id = port.save(
                userId,
                command.name(),
                command.sport(),
                command.description(),
                command.stepsJson(),
                command.tags(),
                command.isTemplate(),
                command.isPublic(),
                "user",
                command.estimatedDurationSeconds(),
                command.estimatedTss()
        );

        log.info("Workout created: id={} user={} name={}", id, userId, command.name());
        return id;
    }

    // ── UpdateWorkoutUseCase ──────────────────────────────────────────────────

    @Override
    @Transactional
    public void update(UUID userId, UUID workoutId, UpdateCommand command) {
        validator.validate(command.stepsJson());

        boolean found = port.update(
                workoutId,
                userId,
                command.name(),
                command.sport(),
                command.description(),
                command.stepsJson(),
                command.tags(),
                command.isTemplate(),
                command.isPublic(),
                command.estimatedDurationSeconds(),
                command.estimatedTss()
        );

        if (!found) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found");
        }

        log.debug("Workout updated: id={} user={}", workoutId, userId);
    }

    // ── DeleteWorkoutUseCase ──────────────────────────────────────────────────

    @Override
    @Transactional
    public void delete(UUID userId, UUID workoutId) {
        boolean found = port.softDelete(workoutId, userId);
        if (!found) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found");
        }
        log.info("Workout soft-deleted: id={} user={}", workoutId, userId);
    }

    // ── ListWorkoutTemplatesUseCase ───────────────────────────────────────────

    @Override
    public TemplatePage listTemplates(String sport, int page, int size) {
        long total = port.countTemplates(sport);
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;

        return new TemplatePage(
                port.listTemplates(sport, page, size),
                page, size, total, totalPages
        );
    }
}
