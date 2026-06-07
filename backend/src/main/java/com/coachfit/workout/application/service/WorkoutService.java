package com.coachfit.workout.application.service;

import com.coachfit.athlete.application.port.in.GetSportZonesUseCase;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.workout.application.port.in.CreateWorkoutUseCase;
import com.coachfit.workout.application.port.in.DeleteWorkoutUseCase;
import com.coachfit.workout.application.port.in.ExportFitUseCase;
import com.coachfit.workout.application.port.in.GetWorkoutUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutTemplatesUseCase;
import com.coachfit.workout.application.port.in.ListWorkoutsUseCase;
import com.coachfit.workout.application.port.in.UpdateWorkoutUseCase;
import com.coachfit.workout.application.port.out.WorkoutExportStoragePort;
import com.coachfit.workout.application.port.out.WorkoutPersistencePort;
import com.coachfit.workout.domain.FitEncoder;
import com.coachfit.workout.domain.WorkoutStepsValidator;
import com.coachfit.shared.domain.workout.WorkoutCalculator;
import com.coachfit.shared.domain.workout.ZoneContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

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
                   ListWorkoutTemplatesUseCase,
                   ExportFitUseCase {

    private static final Logger log = LoggerFactory.getLogger(WorkoutService.class);

    /** Strips characters that are unsafe in filenames. */
    private static final Pattern UNSAFE_FILENAME_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");

    /** Pre-signed URL validity — 24 hours. */
    private static final int EXPORT_URL_EXPIRY_SECONDS = 86_400;

    private final WorkoutPersistencePort  port;
    private final WorkoutStepsValidator   validator;
    private final GetSportZonesUseCase    sportZonesUseCase;
    private final FitEncoder              fitEncoder;
    private final WorkoutExportStoragePort exportStorage;

    public WorkoutService(WorkoutPersistencePort port,
                          WorkoutStepsValidator validator,
                          GetSportZonesUseCase sportZonesUseCase,
                          FitEncoder fitEncoder,
                          WorkoutExportStoragePort exportStorage) {
        this.port              = port;
        this.validator         = validator;
        this.sportZonesUseCase = sportZonesUseCase;
        this.fitEncoder        = fitEncoder;
        this.exportStorage     = exportStorage;
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

        Integer estDur = command.estimatedDurationSeconds();
        java.math.BigDecimal estTss = command.estimatedTss();
        if (estDur == null || estDur == 0 || estTss == null || estTss.compareTo(java.math.BigDecimal.ZERO) == 0) {
            // Load user's threshold settings for accurate TSS estimation
            ZoneContext zoneContext = buildZoneContext(userId, command.sport());
            var calc = WorkoutCalculator.calculate(command.stepsJson(), command.sport(), zoneContext);
            if (estDur == null || estDur == 0) {
                estDur = calc.durationSeconds();
            }
            if (estTss == null || estTss.compareTo(java.math.BigDecimal.ZERO) == 0) {
                estTss = calc.tss();
            }
        }

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
                estDur,
                estTss
        );

        log.info("Workout created: id={} user={} name={}", id, userId, command.name());
        return id;
    }

    // ── UpdateWorkoutUseCase ──────────────────────────────────────────────────

    @Override
    @Transactional
    public void update(UUID userId, UUID workoutId, UpdateCommand command) {
        validator.validate(command.stepsJson());

        Integer estDur = command.estimatedDurationSeconds();
        java.math.BigDecimal estTss = command.estimatedTss();
        if (estDur == null || estDur == 0 || estTss == null || estTss.compareTo(java.math.BigDecimal.ZERO) == 0) {
            // Load user's threshold settings for accurate TSS estimation
            ZoneContext zoneContext = buildZoneContext(userId, command.sport());
            var calc = WorkoutCalculator.calculate(command.stepsJson(), command.sport(), zoneContext);
            if (estDur == null || estDur == 0) {
                estDur = calc.durationSeconds();
            }
            if (estTss == null || estTss.compareTo(java.math.BigDecimal.ZERO) == 0) {
                estTss = calc.tss();
            }
        }

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
                estDur,
                estTss
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

    // ── ExportFitUseCase ──────────────────────────────────────────────────────

    @Override
    public FitExportResult exportFit(UUID userId, UUID workoutId) {
        // 1. Load workout (enforces ownership / 404)
        WorkoutDetail workout = get(userId, workoutId);

        // 2. Resolve zone context — extract FTP and LTHR from user's sport zones
        ZoneContext zoneContext = buildZoneContext(userId, workout.sport());

        // 3. Encode into FIT binary
        byte[] fitBytes = fitEncoder.encode(workout, zoneContext);

        // 4. Store in MinIO workout-exports bucket
        String objectKey = exportStorage.store(userId, workoutId, fitBytes);

        // 5. Generate pre-signed 24h download URL
        String downloadUrl = exportStorage.generateDownloadUrl(objectKey, EXPORT_URL_EXPIRY_SECONDS);

        // 6. Build a safe filename from the workout name
        String safeName = UNSAFE_FILENAME_CHARS.matcher(workout.name()).replaceAll("_");
        String filename  = safeName + ".fit";

        log.info("FIT export: workout={} user={} bytes={}", workoutId, userId, fitBytes.length);
        return new FitExportResult(downloadUrl, objectKey, filename);
    }

    /**
     * Extracts FTP, LTHR, and threshold pace from the athlete's zone list and wraps them
     * in a {@link ZoneContext}. Falls back to {@link ZoneContext#defaults()} values if
     * zones are absent or unconfigured.
     *
     * <p>FIX (BUG-2): threshold pace is now read from {@code zone.thresholdPace()} — the
     * dedicated column — instead of the {@code ftp} column which was semantically wrong.
     */
    private ZoneContext buildZoneContext(UUID userId, String sport) {
        var zones = sportZonesUseCase.getZones(userId);

        int ftp = zones.stream()
                .filter(z -> sport != null
                        && sport.equalsIgnoreCase(z.sport())
                        && "power".equalsIgnoreCase(z.zoneType())
                        && z.ftp() != null)
                .mapToInt(z -> z.ftp())
                .findFirst()
                .orElse(200);

        int lthr = zones.stream()
                .filter(z -> sport != null
                        && sport.equalsIgnoreCase(z.sport())
                        && "heart_rate".equalsIgnoreCase(z.zoneType())
                        && z.lthr() != null)
                .mapToInt(z -> z.lthr())
                .findFirst()
                .orElse(160);

        // BUG-2 FIX: use thresholdPace() — dedicated column added in V039 migration.
        // Previously this incorrectly used z.ftp() for pace zones, always falling back to 300.
        int thresholdPace = zones.stream()
                .filter(z -> sport != null
                        && sport.equalsIgnoreCase(z.sport())
                        && "pace".equalsIgnoreCase(z.zoneType())
                        && z.thresholdPace() != null)
                .mapToInt(z -> z.thresholdPace())
                .findFirst()
                .orElse(300);

        return new ZoneContext(ftp, lthr, thresholdPace);
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
