package com.coachfit.coach.application.service;

import com.coachfit.coach.application.port.in.CoachAthleteDataUseCase;
import com.coachfit.coach.application.port.out.CoachAthletePersistencePort;
import com.coachfit.coach.application.port.out.CoachAthleteQueryPort;
import com.coachfit.coach.application.port.out.CoachUserQueryPort;
import com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException;
import com.coachfit.coach.domain.model.CoachAthlete;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Application service implementing {@link CoachAthleteDataUseCase}.
 *
 * <p>All access is gated on an active coach-athlete relationship with the
 * appropriate permission. Permission enforcement is done at the HTTP layer via
 * {@code @PreAuthorize("@coachAccess.hasAccess(...)")} before this service is called.
 *
 * <p><strong>Cross-module boundary:</strong> Reads athlete data exclusively through
 * {@link CoachAthleteQueryPort} and {@link CoachUserQueryPort} — no direct imports
 * from other modules.
 */
@Service
@Transactional(readOnly = true)
public class CoachAthleteDataService implements CoachAthleteDataUseCase {

    private static final Logger log = LoggerFactory.getLogger(CoachAthleteDataService.class);

    private static final int ALERT_TSB_THRESHOLD   = -20;
    private static final int ALERT_HR_DELTA         = 5;
    private static final int MISSED_WORKOUT_DAYS    = 14;
    private static final int MISSED_WORKOUT_LIMIT   = 5;
    private static final int RECENT_ACTIVITIES_LIMIT = 5;

    private final CoachAthletePersistencePort coachAthletePersistence;
    private final CoachAthleteQueryPort       athleteQuery;
    private final CoachUserQueryPort          userQuery;
    private final ObjectMapper                objectMapper;

    public CoachAthleteDataService(CoachAthletePersistencePort coachAthletePersistence,
                                   CoachAthleteQueryPort athleteQuery,
                                   CoachUserQueryPort userQuery,
                                   ObjectMapper objectMapper) {
        this.coachAthletePersistence = coachAthletePersistence;
        this.athleteQuery            = athleteQuery;
        this.userQuery               = userQuery;
        this.objectMapper            = objectMapper;
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @Override
    public AthleteDashboard getAthleteDashboard(UUID coachId, UUID athleteId) {
        CoachAthlete rel = requireActive(coachId, athleteId);

        CoachUserQueryPort.UserRow       user    = userQuery.findUserById(athleteId).orElse(null);
        CoachUserQueryPort.TrainingLoadRow tl    = userQuery.findLatestTrainingLoad(athleteId).orElse(null);
        CoachUserQueryPort.HealthSnapshotRow hs  = userQuery.findLatestHealthSnapshot(athleteId).orElse(null);

        AthleteProfile profile = new AthleteProfile(
                athleteId,
                user != null ? user.fullName() : "Unknown",
                rel.nickname(),
                user != null ? user.avatarUrl() : null
        );

        FitnessSnap fitness = tl != null
                ? new FitnessSnap(tl.ctl(), tl.atl(), tl.tsb(), deriveTrend(tl.tsb()))
                : null;

        // Weekly summary: current ISO week
        LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd   = weekStart.plusDays(6);
        List<CoachAthleteQueryPort.CalendarRow> weekEvents =
                athleteQuery.findCalendarEvents(athleteId, weekStart, weekEnd);

        WeekSummary weekSummary = computeWeekSummary(weekEvents);

        // Recent activities
        List<CoachAthleteQueryPort.ActivityRow> rawActivities =
                athleteQuery.findRecentActivities(athleteId, RECENT_ACTIVITIES_LIMIT);
        List<ActivitySummary> recentActivities = rawActivities.stream()
                .map(this::mapActivity)
                .toList();

        // Health snapshot
        HealthSnap health = hs != null ? new HealthSnap(hs.restingHr(), hs.sleepScore(), null) : null;

        // Alerts
        List<AlertEntry> alerts = buildAlerts(athleteId, tl, hs);

        return new AthleteDashboard(profile, fitness, weekSummary, recentActivities, health, alerts);
    }

    // ── Activities ────────────────────────────────────────────────────────────

    @Override
    public ActivityPage getAthleteActivities(UUID coachId, UUID athleteId,
                                             int page, int size,
                                             String sport, String from, String to) {
        requireActive(coachId, athleteId);
        int offset = page * size;
        LocalDate fromDate = parseDate(from);
        LocalDate toDate   = parseDate(to);

        List<CoachAthleteQueryPort.ActivityRow> rows =
                athleteQuery.findActivities(athleteId, offset, size, sport, fromDate, toDate);
        long total = athleteQuery.countActivities(athleteId, sport, fromDate, toDate);

        return new ActivityPage(rows.stream().map(this::mapActivity).toList(), page, size, total);
    }

    @Override
    public ActivityDetail getAthleteActivityDetail(UUID coachId, UUID athleteId, UUID activityId) {
        requireActive(coachId, athleteId);
        return athleteQuery.findActivityDetail(athleteId, activityId)
                .map(r -> new ActivityDetail(
                        r.id(), r.sport(), r.subSport(), r.name(), r.description(),
                        r.startedAt(), r.durationSeconds(), r.movingTimeSeconds(),
                        r.distanceMeters(), r.elevationGainMeters(), r.calories(),
                        r.avgHeartRate(), r.maxHeartRate(),
                        r.avgPower(), r.maxPower(), r.normalizedPower(),
                        r.intensityFactor(), r.tss(),
                        r.avgCadence(), r.avgSpeed(),
                        r.startLat(), r.startLng(),
                        r.source(), r.rawFileFormat()
                ))
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "Activity not found: " + activityId));
    }

    @Override
    public ActivityStreams getAthleteActivityStreams(UUID coachId, UUID athleteId, UUID activityId) {
        requireActive(coachId, athleteId);
        return athleteQuery.findActivityStreams(athleteId, activityId)
                .map(r -> new ActivityStreams(
                        r.timestamps(), r.heartRate(), r.power(), r.speed(),
                        r.altitude(), r.distance(), r.cadence(), r.lat(), r.lng()
                ))
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "Activity streams not found: " + activityId));
    }

    // ── Calendar ──────────────────────────────────────────────────────────────

    @Override
    public List<CalendarEventEntry> getAthleteCalendar(UUID coachId, UUID athleteId,
                                                       LocalDate from, LocalDate to) {
        requireActive(coachId, athleteId);
        return athleteQuery.findCalendarEvents(athleteId, from, to).stream()
                .map(r -> new CalendarEventEntry(
                        r.id(), r.date(), r.eventType(), r.title(),
                        r.status(), r.assignedBy(),
                        r.workoutId() != null
                                ? new WorkoutRef(r.workoutId(), r.workoutSport(), r.workoutDuration())
                                : null,
                        r.activityId() != null
                                ? new ActivityRef(r.activityId(), r.activityTss(), r.activityDuration())
                                : null,
                        r.complianceScore(), r.orderIndex()
                ))
                .toList();
    }

    // ── Wellness ──────────────────────────────────────────────────────────────

    @Override
    public WellnessPage getAthleteWellness(UUID coachId, UUID athleteId, String from, String to) {
        requireActive(coachId, athleteId);
        LocalDate fromDate = parseDate(from);
        LocalDate toDate   = parseDate(to);
        int page = 0, size = 90; // wellness typically viewed as a range, not paginated

        List<WellnessEntry> entries = athleteQuery
                .findWellness(athleteId, fromDate, toDate, 0, size).stream()
                .map(r -> new WellnessEntry(r.date(), r.mood(), r.energyLevel(),
                        r.sleepQuality(), r.perceivedFatigue(), r.rpe(), r.notes()))
                .toList();
        long total = athleteQuery.countWellness(athleteId, fromDate, toDate);

        return new WellnessPage(entries, page, size, total);
    }

    // ── Health ────────────────────────────────────────────────────────────────

    @Override
    public HealthDailySummaryPage getAthleteHealthDaily(UUID coachId, UUID athleteId,
                                                        String from, String to) {
        requireActive(coachId, athleteId);
        LocalDate fromDate = parseDate(from);
        LocalDate toDate   = parseDate(to);
        int size = 90;

        List<HealthDailySummary> entries = athleteQuery
                .findHealthDaily(athleteId, fromDate, toDate, 0, size).stream()
                .map(r -> new HealthDailySummary(r.date(), r.restingHr(), r.steps(),
                        r.stressAvg(), r.bodyBattery(), r.spo2(), r.hrv(), r.source()))
                .toList();
        long total = athleteQuery.countHealthDaily(athleteId, fromDate, toDate);

        return new HealthDailySummaryPage(entries, 0, size, total);
    }

    // ── PMC ───────────────────────────────────────────────────────────────────

    @Override
    public List<PmcPoint> getAthletePmc(UUID coachId, UUID athleteId, String from, String to) {
        requireActive(coachId, athleteId);
        LocalDate fromDate = parseDate(from);
        LocalDate toDate   = parseDate(to);

        return athleteQuery.findPmc(athleteId, fromDate, toDate).stream()
                .map(r -> new PmcPoint(r.date(), r.ctl(), r.atl(), r.tsb()))
                .toList();
    }

    // ── Zones ─────────────────────────────────────────────────────────────────

    @Override
    public List<ZoneEntry> getAthleteZones(UUID coachId, UUID athleteId) {
        requireActive(coachId, athleteId);
        return athleteQuery.findZones(athleteId).stream()
                .map(r -> {
                    Object zonesObj = null;
                    if (r.zonesJson() != null) {
                        try {
                            zonesObj = objectMapper.readValue(r.zonesJson(), new TypeReference<Object>() {});
                        } catch (Exception e) {
                            zonesObj = r.zonesJson();
                        }
                    }
                    return new ZoneEntry(r.sport(), r.ftp(), r.lthr(), r.maxHr(), zonesObj);
                })
                .toList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private CoachAthlete requireActive(UUID coachId, UUID athleteId) {
        return coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId)
                .filter(CoachAthlete::isActive)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active relationship for coach " + coachId + " / athlete " + athleteId));
    }

    private ActivitySummary mapActivity(CoachAthleteQueryPort.ActivityRow r) {
        return new ActivitySummary(
                r.id(), r.sport(), r.name(), r.startedAt(),
                r.durationSeconds(), r.distanceMeters(),
                r.avgHeartRate(), r.avgPower(), r.tss(), r.source()
        );
    }

    private WeekSummary computeWeekSummary(List<CoachAthleteQueryPort.CalendarRow> events) {
        double planned   = 0;
        double completed = 0;
        for (var e : events) {
            if ("workout".equals(e.eventType()) && e.workoutDuration() != null) {
                double hours = e.workoutDuration() / 3600.0;
                planned += hours;
                if ("completed".equals(e.status()) || "partial".equals(e.status())) {
                    if (e.activityDuration() != null) {
                        completed += e.activityDuration() / 3600.0;
                    } else {
                        completed += hours; // fallback
                    }
                }
            }
        }
        int compliance = planned > 0 ? (int) Math.round(completed / planned * 100) : 0;
        return new WeekSummary(
                Math.round(planned   * 10.0) / 10.0,
                Math.round(completed * 10.0) / 10.0,
                compliance
        );
    }

    private List<AlertEntry> buildAlerts(UUID athleteId,
                                         CoachUserQueryPort.TrainingLoadRow tl,
                                         CoachUserQueryPort.HealthSnapshotRow hs) {
        List<AlertEntry> alerts = new java.util.ArrayList<>();

        // Overtraining alert: TSB < -20
        if (tl != null && tl.tsb() != null && tl.tsb() < ALERT_TSB_THRESHOLD) {
            alerts.add(new AlertEntry("overtraining", null, null,
                    Math.round(tl.tsb() * 10.0) / 10.0, null));
        }

        // Elevated resting HR alert
        if (hs != null && hs.restingHr() != null && hs.restingHr() > 60) {
            // simplified: flag if > 60; production would compare against athlete baseline
            alerts.add(new AlertEntry("elevated_hr", null, null,
                    hs.restingHr(), null));
        }

        // Missed workouts
        LocalDate twoWeeksAgo = LocalDate.now().minusDays(MISSED_WORKOUT_DAYS);
        athleteQuery.findMissedWorkouts(athleteId, twoWeeksAgo, MISSED_WORKOUT_LIMIT)
                .forEach(mw -> alerts.add(
                        new AlertEntry("missed_workout", mw.date(), mw.workoutTitle(), null, null)));

        return alerts;
    }

    private static String deriveTrend(Double tsb) {
        if (tsb == null) return "unknown";
        if (tsb > 10)  return "peaking";
        if (tsb > 0)   return "fresh";
        if (tsb > -10) return "building";
        return "overreaching";
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}
