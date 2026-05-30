package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Output port: persistence for Garmin epoch (intraday 15-minute) summaries.
 *
 * <p>Epochs represent 15-minute blocks of activity data throughout the day.
 * Multiple epochs per user per day are expected (up to 96 per day).
 */
public interface HealthEpochSummaryPersistencePort {

    /**
     * Upserts a single epoch record.
     *
     * <p>Unique key: {@code (user_id, source, epoch_start)}.
     *
     * @param userId      CoachFit user UUID
     * @param date        calendar date of this epoch (UTC)
     * @param epochStart  absolute UTC timestamp of epoch start
     * @param source      data provider (e.g. "garmin")
     * @param data        epoch metrics
     */
    void upsert(UUID userId, LocalDate date, Instant epochStart,
                String source, EpochData data);

    /**
     * Epoch metrics record.
     *
     * @param durationSeconds  epoch duration (typically 900 = 15 min)
     * @param steps            step count in this epoch
     * @param activeCalories   active kilocalories burned
     * @param met              metabolic equivalent (1.0–20.0)
     * @param intensity        normalized intensity label (sedentary/active/highly_active/rest)
     * @param movingDurationSec seconds actively moving within epoch
     * @param distanceMeters   distance covered
     * @param extraJson        provider-specific extra fields (JSONB)
     * @param rawPayload       full raw payload for debugging
     */
    record EpochData(
            Integer       durationSeconds,
            Integer       steps,
            Integer       activeCalories,
            BigDecimal    met,
            String        intensity,
            Integer       movingDurationSec,
            BigDecimal    distanceMeters,
            String        extraJson,
            String        rawPayload
    ) {}
}
