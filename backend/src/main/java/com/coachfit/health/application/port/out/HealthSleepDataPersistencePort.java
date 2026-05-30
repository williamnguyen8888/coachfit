package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: sleep data persistence.
 */
public interface HealthSleepDataPersistencePort {

    /**
     * Replaces the sleep record for the given user/source/date (wakeup date).
     */
    void upsert(UUID userId, LocalDate date, String source, SleepData data);

    Optional<SleepSnapshot> findByUserSourceDate(UUID userId, String source, LocalDate date);

    /**
     * Returns all sleep records for the user in a date range across all sources,
     * ordered by date DESC.
     */
    List<RichSleepSnapshot> listRange(UUID userId, LocalDate from, LocalDate to);

    /**
     * Returns the most recent sleep record for a user and source at or before {@code asOf}.
     * Used by the dashboard health snapshot.
     */
    Optional<RichSleepSnapshot> findLatest(UUID userId, String source, LocalDate asOf);

    // ── Data carriers ────────────────────────────────────────────────────────

    record SleepData(
            Instant    sleepStart,
            Instant    sleepEnd,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    lightSeconds,
            Integer    remSeconds,
            Integer    awakeSeconds,
            Integer    sleepScore,
            BigDecimal avgRespiration,
            BigDecimal avgSpo2,
            BigDecimal avgHrv,
            String     hrvStatus,
            String     extra,
            String     rawPayload
    ) {}

    /** Narrow snapshot used by existing webhook ingestion code. */
    record SleepSnapshot(
            LocalDate  date,
            String     source,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    remSeconds,
            Integer    sleepScore,
            BigDecimal avgHrv,
            String     hrvStatus
    ) {}

    /** Full read model used by the health sleep API and dashboard snapshot. */
    record RichSleepSnapshot(
            LocalDate  date,
            String     source,
            Instant    sleepStart,
            Instant    sleepEnd,
            Integer    durationSeconds,
            Integer    deepSeconds,
            Integer    lightSeconds,
            Integer    remSeconds,
            Integer    awakeSeconds,
            Integer    sleepScore,
            BigDecimal avgRespiration,
            BigDecimal avgSpo2,
            BigDecimal avgHrv,
            String     hrvStatus
    ) {}
}
