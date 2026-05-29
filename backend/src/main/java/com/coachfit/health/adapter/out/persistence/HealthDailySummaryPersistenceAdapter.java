package com.coachfit.health.adapter.out.persistence;

import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
                     extra, raw_payload, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :date, :source,
                     :steps, :distanceMeters, :caloriesTotal, :caloriesActive,
                     :activeMinutes, :intensityMinutes, :floorsClimbed,
                     :restingHr, :avgHr, :maxHr,
                     :avgStress, :maxStress,
                     :bodyBatteryHigh, :bodyBatteryLow,
                     :avgSpo2, :avgRespiration, :vo2max,
                     :extra::jsonb, :rawPayload::jsonb, now())
                ON CONFLICT (user_id, source, date) DO UPDATE SET
                    steps              = EXCLUDED.steps,
                    distance_meters    = EXCLUDED.distance_meters,
                    calories_total     = EXCLUDED.calories_total,
                    calories_active    = EXCLUDED.calories_active,
                    active_minutes     = EXCLUDED.active_minutes,
                    intensity_minutes  = EXCLUDED.intensity_minutes,
                    floors_climbed     = EXCLUDED.floors_climbed,
                    resting_hr         = EXCLUDED.resting_hr,
                    avg_hr             = EXCLUDED.avg_hr,
                    max_hr             = EXCLUDED.max_hr,
                    avg_stress         = EXCLUDED.avg_stress,
                    max_stress         = EXCLUDED.max_stress,
                    body_battery_high  = EXCLUDED.body_battery_high,
                    body_battery_low   = EXCLUDED.body_battery_low,
                    avg_spo2           = EXCLUDED.avg_spo2,
                    avg_respiration    = EXCLUDED.avg_respiration,
                    vo2max             = EXCLUDED.vo2max,
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
}
