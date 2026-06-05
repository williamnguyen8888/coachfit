package com.coachfit.coach.application.port.in;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Input port: coach reads athlete data (data access APIs).
 *
 * <p>Covers all endpoints under {@code GET /coach/athletes/{id}/...}:
 * dashboard, activities, calendar, wellness, health, training-load/pmc, zones.
 *
 * <p><strong>Permission model:</strong> each method call requires the caller to
 * already hold the relevant {@code CoachPermissions} flag for the athlete.
 * The {@link com.coachfit.coach.security.CoachAccessFacade} enforces this at
 * the HTTP layer via {@code @PreAuthorize}.
 */
public interface CoachAthleteDataUseCase {

    // ── Dashboard ─────────────────────────────────────────────────────────────

    AthleteDashboard getAthleteDashboard(UUID coachId, UUID athleteId);

    // ── Activities ────────────────────────────────────────────────────────────

    ActivityPage getAthleteActivities(UUID coachId, UUID athleteId,
                                      int page, int size,
                                      String sport, String from, String to);

    ActivityDetail getAthleteActivityDetail(UUID coachId, UUID athleteId, UUID activityId);

    ActivityStreams getAthleteActivityStreams(UUID coachId, UUID athleteId, UUID activityId);

    // ── Calendar ──────────────────────────────────────────────────────────────

    List<CalendarEventEntry> getAthleteCalendar(UUID coachId, UUID athleteId,
                                                LocalDate from, LocalDate to);

    // ── Wellness ──────────────────────────────────────────────────────────────

    WellnessPage getAthleteWellness(UUID coachId, UUID athleteId, String from, String to);

    // ── Health ────────────────────────────────────────────────────────────────

    HealthDailySummaryPage getAthleteHealthDaily(UUID coachId, UUID athleteId,
                                                 String from, String to);

    // ── Training Load / PMC ───────────────────────────────────────────────────

    List<PmcPoint> getAthletePmc(UUID coachId, UUID athleteId, String from, String to);

    // ── Zones ─────────────────────────────────────────────────────────────────

    List<ZoneEntry> getAthleteZones(UUID coachId, UUID athleteId);

    // ── Result types ──────────────────────────────────────────────────────────

    record AthleteDashboard(
            AthleteProfile athlete,
            FitnessSnap    fitness,
            WeekSummary    weekSummary,
            List<ActivitySummary> recentActivities,
            HealthSnap     healthSnapshot,
            List<AlertEntry> alerts
    ) {}

    record AthleteProfile(UUID id, String name, String nickname, String avatarUrl) {}

    record FitnessSnap(Double ctl, Double atl, Double tsb, String trend) {}

    record WeekSummary(Double plannedHours, Double completedHours, Integer compliance) {}

    record ActivitySummary(
            UUID   id, String sport, String name,
            String startedAt, Integer durationSeconds, Double distanceMeters,
            Integer avgHeartRate, Integer avgPower, Double tss, String source
    ) {}

    record AlertEntry(String type, String date, String workout, Number value, Number baseline) {}

    record HealthSnap(Integer restingHr, Integer sleepScore, Double hrv) {}

    record ActivityPage(
            List<ActivitySummary> content, int page, int size, long totalElements
    ) {}

    record ActivityDetail(
            UUID id, String sport, String subSport, String name, String description,
            String startedAt, Integer durationSeconds, Integer movingTimeSeconds,
            Double distanceMeters, Double elevationGainMeters, Integer calories,
            Integer avgHeartRate, Integer maxHeartRate, Integer avgPower, Integer maxPower,
            Integer normalizedPower, Double intensityFactor, Double tss,
            Integer avgCadence, Double avgSpeed,
            Double startLat, Double startLng,
            String source, String rawFileFormat
    ) {}

    record ActivityStreams(
            int[]   timestamps,
            short[] heartRate,
            short[] power,
            float[] speed,
            float[] altitude,
            float[] distance,
            float[] cadence,
            double[] lat,
            double[] lng
    ) {}

    record CalendarEventEntry(
            UUID id, String date, String eventType, String title,
            String status, String assignedBy,
            WorkoutRef workout, ActivityRef activity,
            java.math.BigDecimal complianceScore, short orderIndex
    ) {}

    record WorkoutRef(UUID id, String sport, Integer estimatedDuration) {}

    record ActivityRef(UUID id, Double tss, Integer durationSeconds) {}

    record WellnessEntry(
            String date, Integer mood, Integer energyLevel, Integer sleepQuality,
            Integer perceivedFatigue, Integer rpe, String notes
    ) {}

    record WellnessPage(List<WellnessEntry> content, int page, int size, long totalElements) {}

    record HealthDailySummary(
            String date, Integer restingHr, Integer steps, Integer stressAvg,
            Integer bodyBattery, Double spo2, Double hrv, String source
    ) {}

    record HealthDailySummaryPage(
            List<HealthDailySummary> content, int page, int size, long totalElements
    ) {}

    record PmcPoint(String date, Double ctl, Double atl, Double tsb) {}

    record ZoneEntry(String sport, Integer ftp, Integer lthr, Integer maxHr, Object zones) {}
}
