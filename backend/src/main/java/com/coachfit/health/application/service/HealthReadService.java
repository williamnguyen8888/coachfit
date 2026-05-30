package com.coachfit.health.application.service;

import com.coachfit.health.application.port.in.HealthReadUseCase;
import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort;
import com.coachfit.health.application.port.out.HealthDailySummaryPersistencePort.RichDailySummarySnapshot;
import com.coachfit.health.application.port.out.HealthSleepDataPersistencePort;
import com.coachfit.health.application.port.out.HealthSleepDataPersistencePort.RichSleepSnapshot;
import com.coachfit.health.application.port.out.HealthTrendQueryPort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Application service implementing {@link HealthReadUseCase}.
 *
 * <p>All three health endpoints are provider-agnostic: data is unified from
 * all connected providers (Garmin, COROS, Polar, Apple Health...). The {@code source}
 * field in each result item identifies where the data came from.
 */
@Service
public class HealthReadService implements HealthReadUseCase {

    /** Default range for trends if no {@code days} param is supplied. */
    private static final int DEFAULT_TREND_DAYS = 90;
    private static final int MAX_TREND_DAYS     = 365;

    /** Allowed metric values (validated at service layer for a clean 400). */
    private static final Set<String> ALLOWED_METRICS =
            Set.of("resting_hr", "steps", "vo2max", "spo2", "stress",
                   "sleep_score", "hrv", "weight");

    private final HealthDailySummaryPersistencePort dailyPort;
    private final HealthSleepDataPersistencePort    sleepPort;
    private final HealthTrendQueryPort              trendPort;

    public HealthReadService(HealthDailySummaryPersistencePort dailyPort,
                             HealthSleepDataPersistencePort sleepPort,
                             HealthTrendQueryPort trendPort) {
        this.dailyPort = dailyPort;
        this.sleepPort = sleepPort;
        this.trendPort = trendPort;
    }

    // ── listDaily ─────────────────────────────────────────────────────────────

    @Override
    public List<DailySummaryEntry> listDaily(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to, 30);
        return dailyPort.listRange(userId, range.from(), range.to()).stream()
                .map(HealthReadService::toDaily)
                .toList();
    }

    // ── listSleep ─────────────────────────────────────────────────────────────

    @Override
    public List<SleepEntry> listSleep(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to, 30);
        return sleepPort.listRange(userId, range.from(), range.to()).stream()
                .map(HealthReadService::toSleep)
                .toList();
    }

    // ── getTrend ──────────────────────────────────────────────────────────────

    @Override
    public List<TrendPoint> getTrend(UUID userId, String metric, int days) {
        if (!ALLOWED_METRICS.contains(metric)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown metric '" + metric + "'. Allowed: " + ALLOWED_METRICS);
        }
        int clampedDays = Math.min(Math.max(days, 1), MAX_TREND_DAYS);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from  = today.minusDays(clampedDays - 1L);

        return trendPort.queryMetric(userId, metric, from, today).stream()
                .map(p -> new TrendPoint(p.date(), p.source(), p.value()))
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static DateRange resolveRange(LocalDate from, LocalDate to, int defaultDays) {
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now(ZoneOffset.UTC);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(defaultDays - 1L);
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'from' date must not be after 'to' date");
        }
        return new DateRange(effectiveFrom, effectiveTo);
    }

    private record DateRange(LocalDate from, LocalDate to) {}

    private static DailySummaryEntry toDaily(RichDailySummarySnapshot s) {
        return new DailySummaryEntry(
                s.date(), s.source(), s.steps(), s.distanceMeters(),
                s.caloriesTotal(), s.caloriesActive(), s.activeMinutes(),
                s.intensityMinutes(), s.floorsClimbed(),
                s.restingHr(), s.avgHr(), s.maxHr(),
                s.avgStress(), s.maxStress(),
                s.bodyBatteryHigh(), s.bodyBatteryLow(),
                s.avgSpo2(), s.avgRespiration(), s.vo2max(), s.extra());
    }

    private static SleepEntry toSleep(RichSleepSnapshot s) {
        return new SleepEntry(
                s.date(), s.source(), s.sleepStart(), s.sleepEnd(),
                s.durationSeconds(), s.deepSeconds(), s.lightSeconds(),
                s.remSeconds(), s.awakeSeconds(),
                s.sleepScore(), s.avgRespiration(), s.avgSpo2(),
                s.avgHrv(), s.hrvStatus());
    }
}
