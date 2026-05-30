package com.coachfit.subscription.adapter.out.persistence;

import com.coachfit.subscription.application.port.out.SubscriptionQueryPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * JdbcClient adapter implementing {@link SubscriptionQueryPort}.
 *
 * <p>Uses a direct JDBC query against the {@code subscriptions} table —
 * avoids JPA for this read-only surface (no entity needed).
 */
@Repository
class SubscriptionPersistenceAdapter implements SubscriptionQueryPort {

    private final JdbcClient jdbcClient;

    SubscriptionPersistenceAdapter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Optional<SubscriptionRow> findByUserId(UUID userId) {
        return jdbcClient.sql("""
                SELECT id, tier, status, current_period_start, current_period_end
                  FROM subscriptions
                 WHERE user_id = :userId
                """)
                .param("userId", userId)
                .query((rs, rowNum) -> new SubscriptionRow(
                        rs.getObject("id",   UUID.class),
                        rs.getString("tier"),
                        rs.getString("status"),
                        rs.getTimestamp("current_period_start") != null
                                ? rs.getTimestamp("current_period_start").toInstant() : null,
                        rs.getTimestamp("current_period_end") != null
                                ? rs.getTimestamp("current_period_end").toInstant() : null
                ))
                .optional();
    }
}
