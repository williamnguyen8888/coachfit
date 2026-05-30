package com.coachfit.health.adapter.out.persistence;

import com.coachfit.health.application.port.out.HealthEpochSummaryPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link HealthEpochSummaryPersistencePort}.
 *
 * <p>Upserts epoch rows using the {@code (user_id, source, epoch_start)} unique key.
 * All fields are overwritten on conflict as Garmin may re-push corrected epochs.
 */
@Repository
class HealthEpochSummaryPersistenceAdapter implements HealthEpochSummaryPersistencePort {

    private final JdbcClient jdbcClient;

    HealthEpochSummaryPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId, LocalDate date, Instant epochStart,
                       String source, EpochData d) {
        jdbcClient.sql("""
                INSERT INTO health_epoch_summaries
                    (id, user_id, date, epoch_start, duration_seconds, source,
                     steps, active_calories, met, intensity,
                     moving_duration_sec, distance_meters,
                     extra, raw_payload, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :date, :epochStart, :durationSeconds, :source,
                     :steps, :activeCalories, :met, :intensity,
                     :movingDurationSec, :distanceMeters,
                     :extra::jsonb, :rawPayload::jsonb, now())
                ON CONFLICT (user_id, source, epoch_start) DO UPDATE SET
                    date                = EXCLUDED.date,
                    duration_seconds    = EXCLUDED.duration_seconds,
                    steps               = EXCLUDED.steps,
                    active_calories     = EXCLUDED.active_calories,
                    met                 = EXCLUDED.met,
                    intensity           = EXCLUDED.intensity,
                    moving_duration_sec = EXCLUDED.moving_duration_sec,
                    distance_meters     = EXCLUDED.distance_meters,
                    extra               = EXCLUDED.extra,
                    raw_payload         = EXCLUDED.raw_payload
                """)
                .param("userId",           userId)
                .param("date",             date)
                .param("epochStart",       epochStart)
                .param("durationSeconds",  d.durationSeconds())
                .param("source",           source)
                .param("steps",            d.steps())
                .param("activeCalories",   d.activeCalories())
                .param("met",              d.met())
                .param("intensity",        d.intensity())
                .param("movingDurationSec", d.movingDurationSec())
                .param("distanceMeters",   d.distanceMeters())
                .param("extra",            d.extraJson() != null ? d.extraJson() : "{}")
                .param("rawPayload",       d.rawPayload())
                .update();
    }
}
