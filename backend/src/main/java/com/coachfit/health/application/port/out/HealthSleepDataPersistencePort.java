package com.coachfit.health.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
}
