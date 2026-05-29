package com.coachfit.wellness.application.port.out;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: training load persistence.
 *
 * <p>Upserts drive the PMC recalculation pipeline after each activity import.
 */
public interface TrainingLoadPersistencePort {

    /**
     * Upserts the training load record for a given user/sport/date.
     * Called by the PMC calculation job after each activity import or edit.
     */
    void upsert(UUID userId, LocalDate date, String sport,
                BigDecimal dailyTss, BigDecimal ctl, BigDecimal atl, BigDecimal tsb);

    Optional<TrainingLoadSnapshot> findByUserSportDate(UUID userId, String sport, LocalDate date);

    List<TrainingLoadSnapshot> findRange(UUID userId, String sport, LocalDate from, LocalDate to);

    // ── Read model ───────────────────────────────────────────────────────────

    record TrainingLoadSnapshot(
            LocalDate  date,
            String     sport,
            BigDecimal dailyTss,
            BigDecimal ctl,
            BigDecimal atl,
            BigDecimal tsb
    ) {}
}
