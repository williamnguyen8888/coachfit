package com.coachfit.wellness.adapter.out.persistence;

import com.coachfit.wellness.application.port.out.TrainingLoadPersistencePort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing {@link TrainingLoadPersistencePort}.
 *
 * <p>Upsert uses PostgreSQL {@code ON CONFLICT DO UPDATE} for atomic PMC writes.
 * Range reads use JPA for simplicity.
 */
@Repository
class TrainingLoadPersistenceAdapter implements TrainingLoadPersistencePort {

    private final TrainingLoadJpaRepository repo;
    private final JdbcClient               jdbcClient;

    TrainingLoadPersistenceAdapter(TrainingLoadJpaRepository repo, JdbcClient jdbcClient) {
        this.repo       = repo;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public void upsert(UUID userId, LocalDate date, String sport,
                       BigDecimal dailyTss, BigDecimal ctl, BigDecimal atl, BigDecimal tsb) {
        jdbcClient.sql("""
                INSERT INTO training_load (id, user_id, date, sport, daily_tss, ctl, atl, tsb)
                VALUES (gen_random_uuid(), :userId, :date, :sport, :dailyTss, :ctl, :atl, :tsb)
                ON CONFLICT (user_id, sport, date) DO UPDATE SET
                    daily_tss = EXCLUDED.daily_tss,
                    ctl       = EXCLUDED.ctl,
                    atl       = EXCLUDED.atl,
                    tsb       = EXCLUDED.tsb
                """)
                .param("userId",   userId)
                .param("date",     date)
                .param("sport",    sport)
                .param("dailyTss", dailyTss)
                .param("ctl",      ctl)
                .param("atl",      atl)
                .param("tsb",      tsb)
                .update();
    }

    @Override
    public Optional<TrainingLoadSnapshot> findByUserSportDate(UUID userId, String sport, LocalDate date) {
        return repo.findByUserIdAndSportAndDate(userId, sport, date).map(this::toSnapshot);
    }

    @Override
    public List<TrainingLoadSnapshot> findRange(UUID userId, String sport, LocalDate from, LocalDate to) {
        return repo.findByUserIdAndSportAndDateBetweenOrderByDateAsc(userId, sport, from, to)
                .stream().map(this::toSnapshot).toList();
    }

    private TrainingLoadSnapshot toSnapshot(TrainingLoadEntity e) {
        return new TrainingLoadSnapshot(e.date, e.sport, e.dailyTss, e.ctl, e.atl, e.tsb);
    }
}
