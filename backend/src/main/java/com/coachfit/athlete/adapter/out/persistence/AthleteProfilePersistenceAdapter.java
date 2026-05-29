package com.coachfit.athlete.adapter.out.persistence;

import com.coachfit.athlete.application.port.out.AthleteProfilePersistencePort;
import com.coachfit.athlete.domain.model.AthleteProfile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence adapter for {@code athlete_profiles}.
 *
 * <p>Uses JPA for reads (via {@link AthleteProfileJpaRepository}) and
 * JdbcClient for the upsert (to handle the {@code TEXT[]} sports column
 * via native PostgreSQL ARRAY literal — same pattern as
 * {@code OAuthConnectionPersistenceAdapter}).
 */
@Repository
class AthleteProfilePersistenceAdapter implements AthleteProfilePersistencePort {

    private final AthleteProfileJpaRepository jpaRepo;
    private final JdbcClient                  jdbcClient;

    AthleteProfilePersistenceAdapter(AthleteProfileJpaRepository jpaRepo,
                                     JdbcClient jdbcClient) {
        this.jpaRepo    = jpaRepo;
        this.jdbcClient = jdbcClient;
    }

    // ── AthleteProfilePersistencePort ─────────────────────────────────────────

    @Override
    public Optional<AthleteProfile> findByUserId(UUID userId) {
        return jpaRepo.findByUserId(userId).map(this::toDomain);
    }

    @Override
    @Transactional
    public AthleteProfile upsert(AthleteProfile profile) {
        String sportsArray = buildPgArray(
                profile.sports() != null ? profile.sports().toArray(String[]::new) : new String[0]);

        jdbcClient.sql("""
                INSERT INTO athlete_profiles
                    (id, user_id, date_of_birth, gender, weight_kg, height_cm,
                     sports, experience_level, primary_sport, primary_health_source,
                     created_at, updated_at)
                VALUES
                    (gen_random_uuid(), :userId, :dob, :gender, :weightKg, :heightCm,
                """ + sportsArray + """
                ::text[], :experienceLevel, :primarySport, :primaryHealthSource,
                     now(), now())
                ON CONFLICT (user_id) DO UPDATE SET
                    date_of_birth           = EXCLUDED.date_of_birth,
                    gender                  = EXCLUDED.gender,
                    weight_kg               = EXCLUDED.weight_kg,
                    height_cm               = EXCLUDED.height_cm,
                    sports                  = EXCLUDED.sports,
                    experience_level        = EXCLUDED.experience_level,
                    primary_sport           = EXCLUDED.primary_sport,
                    primary_health_source   = EXCLUDED.primary_health_source,
                    updated_at              = now()
                """)
                .param("userId",              profile.userId())
                .param("dob",                 profile.dateOfBirth())
                .param("gender",              profile.gender())
                .param("weightKg",            profile.weightKg())
                .param("heightCm",            profile.heightCm())
                .param("experienceLevel",     profile.experienceLevel())
                .param("primarySport",        profile.primarySport())
                .param("primaryHealthSource", profile.primaryHealthSource())
                .update();

        return jpaRepo.findByUserId(profile.userId())
                .map(this::toDomain)
                .orElseThrow(() -> new IllegalStateException(
                        "Athlete profile not found after upsert for userId=" + profile.userId()));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private AthleteProfile toDomain(AthleteProfileEntity e) {
        List<String> sports = e.sports != null ? Arrays.asList(e.sports) : List.of();
        return new AthleteProfile(
                e.id,
                e.userId,
                e.dateOfBirth,
                e.gender,
                e.weightKg,
                e.heightCm,
                sports,
                e.experienceLevel,
                e.primarySport,
                e.primaryHealthSource,
                e.createdAt,
                e.updatedAt
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Builds a PostgreSQL ARRAY literal: {@code ARRAY['cycling','running']} */
    private String buildPgArray(String[] values) {
        if (values == null || values.length == 0) return "ARRAY[]";
        StringBuilder sb = new StringBuilder("ARRAY['");
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append("','");
            sb.append(values[i].replace("'", "''"));
        }
        sb.append("']");
        return sb.toString();
    }
}
