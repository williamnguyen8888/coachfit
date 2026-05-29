package com.coachfit.wellness.adapter.out.persistence;

import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing {@link WellnessLogPersistencePort}.
 *
 * <p>Upsert uses {@code ON CONFLICT DO UPDATE} with explicit coalesce to merge
 * fields from multiple sources, preserving existing non-null values when the
 * incoming value is null.
 */
@Repository
class WellnessLogPersistenceAdapter implements WellnessLogPersistencePort {

    private final WellnessLogJpaRepository repo;
    private final JdbcClient               jdbcClient;

    WellnessLogPersistenceAdapter(WellnessLogJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId, LocalDate date, String source, WellnessFields f) {
        jdbcClient.sql("""
                INSERT INTO wellness_logs
                    (id, user_id, date, source,
                     mood, rpe, sleep_quality, sleep_hours,
                     fatigue, soreness, stress_level,
                     resting_hr, hrv, weight_kg, notes, field_sources)
                VALUES
                    (gen_random_uuid(), :userId, :date, :source,
                     :mood, :rpe, :sleepQuality, :sleepHours,
                     :fatigue, :soreness, :stressLevel,
                     :restingHr, :hrv, :weightKg, :notes,
                     :fieldSources::jsonb)
                ON CONFLICT (user_id, date) DO UPDATE SET
                    source        = :source,
                    mood          = COALESCE(:mood,         wellness_logs.mood),
                    rpe           = COALESCE(:rpe,          wellness_logs.rpe),
                    sleep_quality = COALESCE(:sleepQuality, wellness_logs.sleep_quality),
                    sleep_hours   = COALESCE(:sleepHours,   wellness_logs.sleep_hours),
                    fatigue       = COALESCE(:fatigue,      wellness_logs.fatigue),
                    soreness      = COALESCE(:soreness,     wellness_logs.soreness),
                    stress_level  = COALESCE(:stressLevel,  wellness_logs.stress_level),
                    resting_hr    = COALESCE(:restingHr,    wellness_logs.resting_hr),
                    hrv           = COALESCE(:hrv,          wellness_logs.hrv),
                    weight_kg     = COALESCE(:weightKg,     wellness_logs.weight_kg),
                    notes         = COALESCE(:notes,        wellness_logs.notes),
                    field_sources = wellness_logs.field_sources || :fieldSources::jsonb
                """)
                .param("userId",       userId)
                .param("date",         date)
                .param("source",       source)
                .param("mood",         f.mood())
                .param("rpe",          f.rpe())
                .param("sleepQuality", f.sleepQuality())
                .param("sleepHours",   f.sleepHours())
                .param("fatigue",      f.fatigue())
                .param("soreness",     f.soreness())
                .param("stressLevel",  f.stressLevel())
                .param("restingHr",    f.restingHr())
                .param("hrv",          f.hrv())
                .param("weightKg",     f.weightKg())
                .param("notes",        f.notes())
                .param("fieldSources", f.fieldSources() != null ? f.fieldSources() : "{}")
                .update();
    }

    @Override
    public Optional<WellnessSnapshot> findByUserAndDate(UUID userId, LocalDate date) {
        return repo.findByUserIdAndDate(userId, date).map(this::toSnapshot);
    }

    private WellnessSnapshot toSnapshot(WellnessLogEntity e) {
        return new WellnessSnapshot(
                e.date, e.source, e.mood, e.rpe, e.sleepQuality,
                e.sleepHours, e.fatigue, e.soreness, e.stressLevel,
                e.restingHr, e.hrv, e.weightKg, e.notes, e.fieldSources);
    }
}
