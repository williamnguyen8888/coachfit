package com.coachfit.health.adapter.out.persistence;

import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing {@link HealthDailySummaryPersistencePort}.
 *
 * <p>Full-replace upsert: the provider always sends the complete day summary,
 * so all fields are overwritten on conflict.
 */
@Repository
class HealthDailySummaryPersistenceAdapter implements HealthDailySummaryPersistencePort {

    private final HealthDailySummaryJpaRepository repo;
    private final JdbcClient                      jdbcClient;

    HealthDailySummaryPersistenceAdapter(HealthDailySummaryJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId, LocalDate date, String source, DailySummaryData d) {
        jdbcClient.sql("""
                INSERT INTO health_daily_summaries
                    (id, user_id, date, source,
                     steps, distance_meters, calories_total, calories_active,
                     active_minutes, intensity_minutes, floors_climbed,
                     resting_hr, avg_hr, max_hr,
                     avg_stress, max_stress,
                     body_battery_high, body_battery_low,
                     avg_spo2, avg_respiration, vo2max,
                     weight_kg, body_fat_pct, muscle_mass_kg, bone_mass_kg, bmi,
                     extra, raw_payload, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :date, :source,
                     :steps, :distanceMeters, :caloriesTotal, :caloriesActive,
                     :activeMinutes, :intensityMinutes, :floorsClimbed,
                     :restingHr, :avgHr, :maxHr,
                     :avgStress, :maxStress,
                     :bodyBatteryHigh, :bodyBatteryLow,
                     :avgSpo2, :avgRespiration, :vo2max,
                     :weightKg, :bodyFatPct, :muscleMassKg, :boneMassKg, :bmi,
                     :extra::jsonb, :rawPayload::jsonb, now())
                ON CONFLICT (user_id, source, date) DO UPDATE SET
                    steps              = COALESCE(EXCLUDED.steps, health_daily_summaries.steps),
                    distance_meters    = COALESCE(EXCLUDED.distance_meters, health_daily_summaries.distance_meters),
                    calories_total     = COALESCE(EXCLUDED.calories_total, health_daily_summaries.calories_total),
                    calories_active    = COALESCE(EXCLUDED.calories_active, health_daily_summaries.calories_active),
                    active_minutes     = COALESCE(EXCLUDED.active_minutes, health_daily_summaries.active_minutes),
                    intensity_minutes  = COALESCE(EXCLUDED.intensity_minutes, health_daily_summaries.intensity_minutes),
                    floors_climbed     = COALESCE(EXCLUDED.floors_climbed, health_daily_summaries.floors_climbed),
                    resting_hr         = COALESCE(EXCLUDED.resting_hr, health_daily_summaries.resting_hr),
                    avg_hr             = COALESCE(EXCLUDED.avg_hr, health_daily_summaries.avg_hr),
                    max_hr             = COALESCE(EXCLUDED.max_hr, health_daily_summaries.max_hr),
                    avg_stress         = COALESCE(EXCLUDED.avg_stress, health_daily_summaries.avg_stress),
                    max_stress         = COALESCE(EXCLUDED.max_stress, health_daily_summaries.max_stress),
                    body_battery_high  = COALESCE(EXCLUDED.body_battery_high, health_daily_summaries.body_battery_high),
                    body_battery_low   = COALESCE(EXCLUDED.body_battery_low, health_daily_summaries.body_battery_low),
                    avg_spo2           = COALESCE(EXCLUDED.avg_spo2, health_daily_summaries.avg_spo2),
                    avg_respiration    = COALESCE(EXCLUDED.avg_respiration, health_daily_summaries.avg_respiration),
                    vo2max             = COALESCE(EXCLUDED.vo2max, health_daily_summaries.vo2max),
                    weight_kg          = COALESCE(EXCLUDED.weight_kg, health_daily_summaries.weight_kg),
                    body_fat_pct       = COALESCE(EXCLUDED.body_fat_pct, health_daily_summaries.body_fat_pct),
                    muscle_mass_kg     = COALESCE(EXCLUDED.muscle_mass_kg, health_daily_summaries.muscle_mass_kg),
                    bone_mass_kg       = COALESCE(EXCLUDED.bone_mass_kg, health_daily_summaries.bone_mass_kg),
                    bmi                = COALESCE(EXCLUDED.bmi, health_daily_summaries.bmi),
                    extra              = EXCLUDED.extra,
                    raw_payload        = EXCLUDED.raw_payload
                """)
                .param("userId",           userId)
                .param("date",             date)
                .param("source",           source)
                .param("steps",            d.steps())
                .param("distanceMeters",   d.distanceMeters())
                .param("caloriesTotal",    d.caloriesTotal())
                .param("caloriesActive",   d.caloriesActive())
                .param("activeMinutes",    d.activeMinutes())
                .param("intensityMinutes", d.intensityMinutes())
                .param("floorsClimbed",    d.floorsClimbed())
                .param("restingHr",        d.restingHr())
                .param("avgHr",            d.avgHr())
                .param("maxHr",            d.maxHr())
                .param("avgStress",        d.avgStress())
                .param("maxStress",        d.maxStress())
                .param("bodyBatteryHigh",  d.bodyBatteryHigh())
                .param("bodyBatteryLow",   d.bodyBatteryLow())
                .param("avgSpo2",          d.avgSpo2())
                .param("avgRespiration",   d.avgRespiration())
                .param("vo2max",           d.vo2max())
                .param("weightKg",         d.weightKg())
                .param("bodyFatPct",       d.bodyFatPct())
                .param("muscleMassKg",     d.muscleMassKg())
                .param("boneMassKg",       d.boneMassKg())
                .param("bmi",              d.bmi())
                .param("extra",            d.extra() != null ? d.extra() : "{}")
                .param("rawPayload",       d.rawPayload())
                .update();
    }

    @Override
    public Optional<DailySummarySnapshot> findByUserSourceDate(UUID userId, String source, LocalDate date) {
        return repo.findByUserIdAndSourceAndDate(userId, source, date).map(e ->
                new DailySummarySnapshot(e.date, e.source, e.steps, e.distanceMeters,
                        e.caloriesTotal, e.restingHr, e.avgSpo2, e.vo2max, e.extra));
    }

    @Override
    public List<RichDailySummarySnapshot> listRange(UUID userId, LocalDate from, LocalDate to) {
        return repo.findByUserIdAndDateBetweenOrderByDateDesc(userId, from, to)
                .stream().map(this::toRich).toList();
    }

    @Override
    public Optional<RichDailySummarySnapshot> findLatest(UUID userId, String source, LocalDate asOf) {
        return repo.findFirstByUserIdAndSourceAndDateLessThanEqualOrderByDateDesc(userId, source, asOf)
                .map(this::toRich);
    }

    private RichDailySummarySnapshot toRich(HealthDailySummaryEntity e) {
        return new RichDailySummarySnapshot(
                e.date, e.source,
                e.steps, e.distanceMeters, e.caloriesTotal, e.caloriesActive,
                e.activeMinutes, e.intensityMinutes, e.floorsClimbed,
                e.restingHr, e.avgHr, e.maxHr,
                e.avgStress, e.maxStress,
                e.bodyBatteryHigh, e.bodyBatteryLow,
                e.avgSpo2, e.avgRespiration, e.vo2max,
                e.weightKg, e.bodyFatPct, e.bmi,
                e.extra);
    }
}

