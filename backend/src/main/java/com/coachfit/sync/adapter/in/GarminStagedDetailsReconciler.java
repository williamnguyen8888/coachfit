package com.coachfit.sync.adapter.in;

import com.coachfit.sync.application.service.GarminActivitySyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Scheduled job: reconciles Garmin activity-details that arrived before
 * their parent activity summary (race condition).
 *
 * <h3>Background</h3>
 * <p>When Garmin pushes {@code /activity-details} before {@code /activities} for the
 * same summaryId, the details are staged in {@code activity_details_staging} instead
 * of being dropped. This job runs every 5 minutes to retry all pending staged rows.
 *
 * <h3>Schedule</h3>
 * <ul>
 *   <li>Every 5 minutes via cron.</li>
 *   <li>Rows older than 7 days with no parent are moved to {@code error} status.</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Activity Details Race Condition Reconciliation.
 */
@Component
public class GarminStagedDetailsReconciler {

    private static final Logger log = LoggerFactory.getLogger(GarminStagedDetailsReconciler.class);

    private final GarminActivitySyncService activitySyncService;
    private final JdbcClient                jdbcClient;

    public GarminStagedDetailsReconciler(GarminActivitySyncService activitySyncService,
                                          JdbcClient jdbcClient) {
        this.activitySyncService = activitySyncService;
        this.jdbcClient          = jdbcClient;
    }

    /**
     * Runs every 5 minutes. Finds all users with pending staged activity-details
     * and attempts reconciliation for each.
     */
    @Scheduled(cron = "0 */5 * * * *")
    public void reconcile() {
        List<UUID> affectedUsers = findUsersWithPendingStaged();
        if (affectedUsers.isEmpty()) {
            log.debug("GarminStagedDetailsReconciler: no pending rows found");
            return;
        }

        log.info("GarminStagedDetailsReconciler: reconciling staged details for {} user(s)", affectedUsers.size());
        for (UUID userId : affectedUsers) {
            try {
                activitySyncService.reconcileStagedDetails(userId);
            } catch (Exception e) {
                log.error("GarminStagedDetailsReconciler: failed for userId={} error={}",
                        userId, e.getMessage(), e);
            }
        }
    }

    private List<UUID> findUsersWithPendingStaged() {
        return jdbcClient.sql("""
                SELECT DISTINCT user_id
                  FROM activity_details_staging
                 WHERE source        = 'garmin'
                   AND status        = 'pending'
                   AND attempt_count < 5
                   AND created_at    > now() - INTERVAL '7 days'
                """)
                .query((rs, n) -> (UUID) rs.getObject("user_id"))
                .list();
    }
}
