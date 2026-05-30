package com.coachfit.health.adapter.out.persistence;

import com.coachfit.health.application.port.out.HealthSleepDataPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing {@link HealthSleepDataPersistencePort}.
 *
 * <p>Full-replace upsert: providers resend complete nightly records.
 */
@Repository
class HealthSleepDataPersistenceAdapter implements HealthSleepDataPersistencePort {

    private final HealthSleepDataJpaRepository repo;
    private final JdbcClient                   jdbcClient;

    HealthSleepDataPersistenceAdapter(HealthSleepDataJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId, LocalDate date, String source, SleepData d) {
        jdbcClient.sql("""
                INSERT INTO health_sleep_data
                    (id, user_id, date, source,
                     sleep_start, sleep_end, duration_seconds,
                     deep_seconds, light_seconds, rem_seconds, awake_seconds,
                     sleep_score, avg_respiration, avg_spo2, avg_hrv, hrv_status,
                     extra, raw_payload, created_at)
                VALUES
                    (gen_random_uuid(), :userId, :date, :source,
                     :sleepStart, :sleepEnd, :durationSeconds,
                     :deepSeconds, :lightSeconds, :remSeconds, :awakeSeconds,
                     :sleepScore, :avgRespiration, :avgSpo2, :avgHrv, :hrvStatus,
                     :extra::jsonb, :rawPayload::jsonb, now())
                ON CONFLICT (user_id, source, date) DO UPDATE SET
                    sleep_start       = EXCLUDED.sleep_start,
                    sleep_end         = EXCLUDED.sleep_end,
                    duration_seconds  = EXCLUDED.duration_seconds,
                    deep_seconds      = EXCLUDED.deep_seconds,
                    light_seconds     = EXCLUDED.light_seconds,
                    rem_seconds       = EXCLUDED.rem_seconds,
                    awake_seconds     = EXCLUDED.awake_seconds,
                    sleep_score       = EXCLUDED.sleep_score,
                    avg_respiration   = EXCLUDED.avg_respiration,
                    avg_spo2          = EXCLUDED.avg_spo2,
                    avg_hrv           = EXCLUDED.avg_hrv,
                    hrv_status        = EXCLUDED.hrv_status,
                    extra             = EXCLUDED.extra,
                    raw_payload       = EXCLUDED.raw_payload
                """)
                .param("userId",          userId)
                .param("date",            date)
                .param("source",          source)
                .param("sleepStart",      d.sleepStart())
                .param("sleepEnd",        d.sleepEnd())
                .param("durationSeconds", d.durationSeconds())
                .param("deepSeconds",     d.deepSeconds())
                .param("lightSeconds",    d.lightSeconds())
                .param("remSeconds",      d.remSeconds())
                .param("awakeSeconds",    d.awakeSeconds())
                .param("sleepScore",      d.sleepScore())
                .param("avgRespiration",  d.avgRespiration())
                .param("avgSpo2",         d.avgSpo2())
                .param("avgHrv",          d.avgHrv())
                .param("hrvStatus",       d.hrvStatus())
                .param("extra",           d.extra() != null ? d.extra() : "{}")
                .param("rawPayload",      d.rawPayload())
                .update();
    }

    @Override
    public Optional<SleepSnapshot> findByUserSourceDate(UUID userId, String source, LocalDate date) {
        return repo.findByUserIdAndSourceAndDate(userId, source, date).map(e ->
                new SleepSnapshot(e.date, e.source, e.durationSeconds,
                        e.deepSeconds, e.remSeconds, e.sleepScore,
                        e.avgHrv, e.hrvStatus));
    }

    @Override
    public List<RichSleepSnapshot> listRange(UUID userId, LocalDate from, LocalDate to) {
        return repo.findByUserIdAndDateBetweenOrderByDateDesc(userId, from, to)
                .stream().map(this::toRich).toList();
    }

    @Override
    public Optional<RichSleepSnapshot> findLatest(UUID userId, String source, LocalDate asOf) {
        return repo.findFirstByUserIdAndSourceAndDateLessThanEqualOrderByDateDesc(userId, source, asOf)
                .map(this::toRich);
    }

    private RichSleepSnapshot toRich(HealthSleepDataEntity e) {
        return new RichSleepSnapshot(
                e.date, e.source,
                e.sleepStart, e.sleepEnd,
                e.durationSeconds, e.deepSeconds, e.lightSeconds,
                e.remSeconds, e.awakeSeconds,
                e.sleepScore, e.avgRespiration, e.avgSpo2,
                e.avgHrv, e.hrvStatus);
    }
}
