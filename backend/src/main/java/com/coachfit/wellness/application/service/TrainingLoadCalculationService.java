package com.coachfit.wellness.application.service;

import com.coachfit.wellness.application.port.out.TrainingLoadPersistencePort;
import com.coachfit.wellness.application.port.out.TrainingLoadPersistencePort.TrainingLoadSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/**
 * PMC (Performance Management Chart) calculation engine.
 *
 * <p>Computes CTL, ATL and TSB using standard exponential moving average (EMA)
 * formulae identical to TrainingPeaks and Intervals.icu:
 *
 * <pre>
 * CTL_t = CTL_{t-1} × (1 - 1/42) + TSS_t × (1/42)
 * ATL_t = ATL_{t-1} × (1 - 1/7)  + TSS_t × (1/7)
 * TSB_t = CTL_{t-1} - ATL_{t-1}   [form on day t is based on yesterday's fitness/fatigue]
 * </pre>
 *
 * <p>Results are written to the {@code training_load} table for:
 * <ul>
 *   <li>The specific sport of the activity (e.g. {@code "cycling"})</li>
 *   <li>The cross-sport rollup row ({@code sport = "all"})</li>
 * </ul>
 *
 * <p>This service is called by {@link TrainingLoadEventListener} after every
 * {@code ActivityCreatedEvent} and {@code ActivityDeletedEvent}.
 */
@Service
public class TrainingLoadCalculationService {

    private static final Logger log = LoggerFactory.getLogger(TrainingLoadCalculationService.class);

    /** EMA decay factor for CTL (42-day time constant). */
    private static final BigDecimal K_CTL = BigDecimal.ONE
            .subtract(BigDecimal.ONE.divide(BigDecimal.valueOf(42), MathContext.DECIMAL128));

    /** EMA complement for CTL: 1/42. */
    private static final BigDecimal K_CTL_COMP = BigDecimal.ONE
            .divide(BigDecimal.valueOf(42), MathContext.DECIMAL128);

    /** EMA decay factor for ATL (7-day time constant). */
    private static final BigDecimal K_ATL = BigDecimal.ONE
            .subtract(BigDecimal.ONE.divide(BigDecimal.valueOf(7), MathContext.DECIMAL128));

    /** EMA complement for ATL: 1/7. */
    private static final BigDecimal K_ATL_COMP = BigDecimal.ONE
            .divide(BigDecimal.valueOf(7), MathContext.DECIMAL128);

    private static final int SCALE = 2;
    private static final RoundingMode RM = RoundingMode.HALF_UP;

    private final TrainingLoadPersistencePort loadPort;
    private final JdbcClient                 jdbcClient;

    public TrainingLoadCalculationService(TrainingLoadPersistencePort loadPort,
                                         JdbcClient jdbcClient) {
        this.loadPort   = loadPort;
        this.jdbcClient = jdbcClient;
    }

    /**
     * Recalculates and persists PMC metrics for a given user/sport/date.
     *
     * <p>This is the entry point called after an activity is created or deleted.
     * It recalculates forward from {@code activityDate} to {@code LocalDate.now()}
     * to ensure all future days remain consistent after a change on a past date.
     *
     * @param userId       the user
     * @param sport        the sport of the activity (e.g. {@code "cycling"})
     * @param activityDate the date of the activity that triggered this recalculation
     */
    @Transactional
    public void recalculateFrom(UUID userId, String sport, LocalDate activityDate) {
        LocalDate today = LocalDate.now();

        // Recalculate for the specific sport
        recalculateSportFrom(userId, sport, activityDate, today);

        // Recalculate the cross-sport "all" rollup
        recalculateSportFrom(userId, "all", activityDate, today);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Recalculates CTL/ATL/TSB for a single sport row from {@code from} to {@code to}.
     */
    private void recalculateSportFrom(UUID userId, String sport,
                                      LocalDate from, LocalDate to) {
        // Load the previous day's state as the starting point
        LocalDate prevDay = from.minusDays(1);
        TrainingLoadSnapshot prev = loadPort.findByUserSportDate(userId, sport, prevDay)
                .orElse(null);

        BigDecimal prevCtl = prev != null && prev.ctl() != null ? prev.ctl() : BigDecimal.ZERO;
        BigDecimal prevAtl = prev != null && prev.atl() != null ? prev.atl() : BigDecimal.ZERO;

        // Walk forward day by day from `from` to `to`
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            // Sum all TSS from activities on this day for this user/sport
            BigDecimal dailyTss = queryDailyTss(userId, sport, cursor);
            if (dailyTss == null) dailyTss = BigDecimal.ZERO;

            // TSB is always computed from YESTERDAY's CTL and ATL (TrainingPeaks convention)
            BigDecimal tsb = prevCtl.subtract(prevAtl).setScale(SCALE, RM);

            // EMA update
            BigDecimal ctl = prevCtl.multiply(K_CTL).add(dailyTss.multiply(K_CTL_COMP)).setScale(SCALE, RM);
            BigDecimal atl = prevAtl.multiply(K_ATL).add(dailyTss.multiply(K_ATL_COMP)).setScale(SCALE, RM);

            loadPort.upsert(userId, cursor, sport, dailyTss.setScale(SCALE, RM), ctl, atl, tsb);

            log.debug("PMC recalc: userId={} sport={} date={} tss={} ctl={} atl={} tsb={}",
                    userId, sport, cursor, dailyTss, ctl, atl, tsb);

            prevCtl = ctl;
            prevAtl = atl;
            cursor  = cursor.plusDays(1);
        }

        log.info("PMC recalculated: userId={} sport={} from={} to={}", userId, sport, from, to);
    }

    /**
     * Queries the sum of TSS for all non-deleted activities of the given user and sport
     * on the given date (UTC day boundary).
     *
     * <p>For the {@code "all"} rollup, the sport filter is omitted.
     */
    private BigDecimal queryDailyTss(UUID userId, String sport, LocalDate date) {
        String sportFilter = "all".equalsIgnoreCase(sport) ? "" : "AND sport = :sport";

        String sql = """
                SELECT COALESCE(SUM(tss), 0)
                  FROM activities
                 WHERE user_id    = :userId
                   AND deleted_at IS NULL
                   AND tss        IS NOT NULL
                   AND DATE(started_at AT TIME ZONE 'UTC') = :date
                """ + sportFilter;

        var stmt = jdbcClient.sql(sql)
                .param("userId", userId)
                .param("date",   date);

        if (!sportFilter.isEmpty()) {
            stmt = stmt.param("sport", sport);
        }

        return stmt.query(BigDecimal.class).single();
    }
}
