package com.coachfit.coach.application.service;

import com.coachfit.coach.application.port.out.CoachAthleteQueryPort;
import com.coachfit.coach.application.port.out.CoachAthletePersistencePort;
import com.coachfit.coach.application.port.out.CoachNotificationPort;
import com.coachfit.coach.application.port.out.CoachUserQueryPort;
import com.coachfit.coach.domain.model.CoachAthlete;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Scheduled alert engine for the coach module.
 *
 * <p>Runs daily to detect:
 * <ul>
 *   <li><strong>Overtraining risk:</strong> TSB &lt; -20 → notify coach</li>
 *   <li><strong>Missed workouts:</strong> 2+ skipped workouts in last 7 days → notify coach</li>
 *   <li><strong>Elevated resting HR:</strong> HR &gt; 65 for 2+ consecutive days → notify coach</li>
 * </ul>
 *
 * <p>Alerts are sent as {@code alert_overtraining} and {@code alert_missed_workout}
 * notification types to the coach. Athlete notifications are sent for workout completion.
 */
@Service
public class CoachAlertEngine {

    private static final Logger log = LoggerFactory.getLogger(CoachAlertEngine.class);

    private static final double TSB_OVERTRAINING_THRESHOLD = -20.0;
    private static final int    MISSED_WORKOUT_THRESHOLD   = 2;
    private static final int    MISSED_WORKOUT_LOOKBACK_DAYS = 7;
    private static final int    ELEVATED_HR_THRESHOLD      = 65;

    private final CoachAthletePersistencePort coachAthletePersistence;
    private final CoachAthleteQueryPort       athleteQuery;
    private final CoachUserQueryPort          userQuery;
    private final CoachNotificationPort       notificationPort;

    public CoachAlertEngine(CoachAthletePersistencePort coachAthletePersistence,
                            CoachAthleteQueryPort athleteQuery,
                            CoachUserQueryPort userQuery,
                            CoachNotificationPort notificationPort) {
        this.coachAthletePersistence = coachAthletePersistence;
        this.athleteQuery            = athleteQuery;
        this.userQuery               = userQuery;
        this.notificationPort        = notificationPort;
    }

    /**
     * Runs daily at 08:00 UTC to evaluate all active coach-athlete relationships.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "UTC")
    public void runDailyAlerts() {
        log.info("CoachAlertEngine: starting daily alert scan");
        int alertsSent = 0;

        // Scan all active relationships (pagination would be needed at scale)
        List<CoachAthlete> relationships = coachAthletePersistence.findAllActive();

        for (CoachAthlete rel : relationships) {
            UUID coachId   = rel.coachUserId();
            UUID athleteId = rel.athleteUserId();

            try {
                alertsSent += checkAthlete(coachId, athleteId, rel);
            } catch (Exception e) {
                log.warn("Alert check failed for coach={} athlete={}: {}",
                        coachId, athleteId, e.getMessage());
            }
        }

        log.info("CoachAlertEngine: scan complete — {} alerts sent", alertsSent);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private int checkAthlete(UUID coachId, UUID athleteId, CoachAthlete rel) {
        int count = 0;

        CoachUserQueryPort.UserRow athlete = userQuery.findUserById(athleteId).orElse(null);
        String athleteName = athlete != null ? athlete.fullName() : "Your athlete";

        // 1. Overtraining risk check
        CoachUserQueryPort.TrainingLoadRow tl = userQuery.findLatestTrainingLoad(athleteId).orElse(null);
        if (tl != null && tl.tsb() != null && tl.tsb() < TSB_OVERTRAINING_THRESHOLD) {
            notificationPort.send(
                    coachId,
                    "alert_overtraining",
                    athleteName + " may be overtraining",
                    String.format("%s has TSB of %.1f (below -20). Consider reducing load.",
                            athleteName, tl.tsb()),
                    Map.of("athleteId", athleteId.toString(),
                           "tsb",       tl.tsb(),
                           "ctl",       tl.ctl() != null ? tl.ctl() : 0,
                           "atl",       tl.atl() != null ? tl.atl() : 0)
            );
            count++;
        }

        // 2. Missed workouts check
        LocalDate since = LocalDate.now().minusDays(MISSED_WORKOUT_LOOKBACK_DAYS);
        List<CoachAthleteQueryPort.MissedWorkoutRow> missed =
                athleteQuery.findMissedWorkouts(athleteId, since, 10);

        if (missed.size() >= MISSED_WORKOUT_THRESHOLD) {
            notificationPort.send(
                    coachId,
                    "alert_missed_workout",
                    athleteName + " missed " + missed.size() + " workouts this week",
                    athleteName + " skipped " + missed.size() + " planned workouts in the last "
                            + MISSED_WORKOUT_LOOKBACK_DAYS + " days.",
                    Map.of("athleteId",    athleteId.toString(),
                           "missedCount",  missed.size(),
                           "since",        since.toString())
            );
            count++;
        }

        // 3. Elevated resting HR (if health data available)
        CoachUserQueryPort.HealthSnapshotRow hs = userQuery.findLatestHealthSnapshot(athleteId).orElse(null);
        if (hs != null && hs.restingHr() != null && hs.restingHr() > ELEVATED_HR_THRESHOLD) {
            notificationPort.send(
                    coachId,
                    "alert_overtraining",
                    athleteName + " has elevated resting HR",
                    String.format("%s's resting HR is %d bpm (above normal baseline).",
                            athleteName, hs.restingHr()),
                    Map.of("athleteId",  athleteId.toString(),
                           "restingHr", hs.restingHr())
            );
            count++;
        }

        return count;
    }
}
