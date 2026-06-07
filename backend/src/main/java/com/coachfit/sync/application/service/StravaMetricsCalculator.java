package com.coachfit.sync.application.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure domain logic for training metrics calculation.
 *
 * <p>No Spring dependencies. All methods are stateless and testable in isolation.
 *
 * <p>Formulas per docs/06-sync-engine-spec.md §Metrics Calculation.
 */
final class StravaMetricsCalculator {

    private StravaMetricsCalculator() {}

    // ── Power-based metrics ───────────────────────────────────────────────────

    /**
     * Normalized Power (NP) from a 1-second-resolution power stream.
     *
     * <p>Algorithm:
     * <ol>
     *   <li>30-second rolling average</li>
     *   <li>Raise each value to the 4th power</li>
     *   <li>Average all values</li>
     *   <li>Take the 4th root</li>
     * </ol>
     *
     * @param powerWatts 1-second power data (may contain zeros for coasting)
     * @return NP in watts, or {@code null} if the stream has fewer than 30 points
     */
    static Integer calculateNp(int[] powerWatts) {
        if (powerWatts == null || powerWatts.length < 30) return null;

        int n = powerWatts.length;
        double[] rolling = new double[n - 29];

        for (int i = 29; i < n; i++) {
            double sum = 0;
            for (int j = i - 29; j <= i; j++) sum += powerWatts[j];
            rolling[i - 29] = sum / 30.0;
        }

        double mean4 = 0;
        for (double v : rolling) mean4 += Math.pow(v, 4);
        mean4 /= rolling.length;

        return (int) Math.round(Math.pow(mean4, 0.25));
    }

    /**
     * Intensity Factor — ratio of NP to FTP.
     *
     * @param np  normalized power in watts
     * @param ftp functional threshold power in watts
     * @return IF rounded to 3 decimal places, or {@code null} if ftp ≤ 0
     */
    static BigDecimal calculateIf(int np, int ftp) {
        if (ftp <= 0) return null;
        return BigDecimal.valueOf((double) np / ftp).setScale(3, RoundingMode.HALF_UP);
    }

    /**
     * Training Stress Score (power-based TSS).
     *
     * <pre>TSS = (durationSeconds × NP × IF) / (FTP × 3600) × 100</pre>
     *
     * @param durationSeconds elapsed time in seconds
     * @param np              normalized power in watts
     * @param intensityFactor IF as computed by {@link #calculateIf}
     * @param ftp             functional threshold power in watts
     * @return TSS rounded to 1 decimal place, or {@code null} if any input is null/invalid
     */
    static BigDecimal calculateTss(int durationSeconds, int np, BigDecimal intensityFactor, int ftp) {
        if (ftp <= 0 || intensityFactor == null) return null;
        double tss = ((double) durationSeconds * np * intensityFactor.doubleValue())
                / ((double) ftp * 3600.0) * 100.0;
        return BigDecimal.valueOf(tss).setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Variability Index (VI) — measures power distribution evenness.
     *
     * <pre>VI = NP / AvgPower</pre>
     *
     * <p>VI ≈ 1.0 for very steady-state efforts (TT). Higher values indicate more
     * variability (criterium, climbs). Industry benchmark: good pacing = VI ≤ 1.05.
     *
     * @param np       normalized power in watts
     * @param avgPower average power in watts
     * @return VI rounded to 3 decimal places, or {@code null} if avgPower ≤ 0
     */
    static BigDecimal calculateVi(int np, int avgPower) {
        if (avgPower <= 0) return null;
        return BigDecimal.valueOf((double) np / avgPower).setScale(3, RoundingMode.HALF_UP);
    }

    /**
     * Efficiency Factor (EF) — measures aerobic efficiency (power vs HR).
     *
     * <pre>EF = NP / AvgHR</pre>
     *
     * <p>Higher EF = more power per heartbeat = better aerobic fitness.
     * Tracking EF over a season is a key fitness indicator. Typical values: 1.0–2.5 for cycling.
     *
     * @param np    normalized power in watts
     * @param avgHr average heart rate in bpm
     * @return EF rounded to 3 decimal places, or {@code null} if avgHr ≤ 0
     */
    static BigDecimal calculateEf(int np, int avgHr) {
        if (avgHr <= 0) return null;
        return BigDecimal.valueOf((double) np / avgHr).setScale(3, RoundingMode.HALF_UP);
    }

    // ── Pace-based metrics ────────────────────────────────────────────────────

    /**
     * Running TSS (rTSS) — pace-based TSS for running activities without a power meter.
     *
     * <pre>
     * pace_IF  = thresholdPace / avgPace   (lower pace = faster, so IF > 1 when faster than threshold)
     * rTSS     = (durationSeconds × pace_IF²) / 3600 × 100
     * </pre>
     *
     * <p>Uses the same mathematical structure as power TSS (Coggan) but substitutes
     * pace intensity for power intensity. When {@code avgPace ≥ thresholdPace}, the athlete
     * is at or below threshold intensity and IF ≤ 1.
     *
     * @param durationSeconds       activity duration in seconds
     * @param avgPaceSecPerKm       average pace in seconds per km (lower = faster)
     * @param thresholdPaceSecPerKm threshold pace in seconds per km from sport_zones
     * @return rTSS rounded to 1 decimal place, or {@code null} if pace data is missing/invalid
     */
    static BigDecimal calculateRtss(int durationSeconds, double avgPaceSecPerKm,
                                    int thresholdPaceSecPerKm) {
        if (thresholdPaceSecPerKm <= 0 || avgPaceSecPerKm <= 0) return null;
        if (durationSeconds <= 0) return BigDecimal.ZERO;

        // IF: threshold / avg — faster pace gives IF > 1 (more intense)
        double paceIf = (double) thresholdPaceSecPerKm / avgPaceSecPerKm;
        double rtss = ((double) durationSeconds * paceIf * paceIf) / 3600.0 * 100.0;
        return BigDecimal.valueOf(rtss).setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Swim TSS (sTSS) — CSS-based TSS for swimming activities.
     *
     * <pre>
     * swim_IF = css / avgPace100m   (lower pace = faster swim)
     * sTSS    = (durationSeconds × swim_IF²) / 3600 × 100
     * </pre>
     *
     * @param durationSeconds    activity duration in seconds
     * @param avgPaceSecPer100m  average pace in seconds per 100m
     * @param cssSecPer100m      Critical Swim Speed from sport_zones (sec/100m)
     * @return sTSS rounded to 1 decimal place, or {@code null} if CSS data is missing/invalid
     */
    static BigDecimal calculateStss(int durationSeconds, double avgPaceSecPer100m,
                                    int cssSecPer100m) {
        if (cssSecPer100m <= 0 || avgPaceSecPer100m <= 0) return null;
        if (durationSeconds <= 0) return BigDecimal.ZERO;

        double swimIf = (double) cssSecPer100m / avgPaceSecPer100m;
        double stss = ((double) durationSeconds * swimIf * swimIf) / 3600.0 * 100.0;
        return BigDecimal.valueOf(stss).setScale(1, RoundingMode.HALF_UP);
    }

    // ── HR-based metrics ──────────────────────────────────────────────────────

    /**
     * HR-based TSS (hrTSS) using the TRIMP-based formula for activities without power data.
     *
     * <p>Algorithm (docs/06-sync-engine-spec.md §HR-based TSS):
     * <pre>
     * ΔHR    = (avgHR - restingHR) / (maxHR - restingHR)
     * TRIMP  = durationMin × ΔHR × weighting
     * hrTSS  = TRIMP × 100   (scaled to approximate TSS)
     * </pre>
     *
     * <p>Gender weighting:
     * <ul>
     *   <li>Male:   {@code 0.64 × e^(1.92 × ΔHR)}</li>
     *   <li>Female: {@code 0.86 × e^(1.67 × ΔHR)}</li>
     * </ul>
     *
     * @param durationSeconds activity duration
     * @param avgHr           average heart rate during activity
     * @param maxHr           max heart rate during activity
     * @param restingHr       athlete resting heart rate (default 60 if unknown)
     * @param athleteMaxHr    athlete's known max HR (default 190 if unknown)
     * @param isMale          true for male weighting, false for female
     * @return hrTSS rounded to 1 decimal place, or {@code null} if inputs are insufficient
     */
    static BigDecimal calculateHrTss(int durationSeconds, int avgHr, int maxHr,
                                     int restingHr, int athleteMaxHr, boolean isMale) {
        int effectiveMaxHr = Math.max(athleteMaxHr, maxHr);
        if (effectiveMaxHr <= restingHr) return null;

        double deltaHr = (double) (avgHr - restingHr) / (effectiveMaxHr - restingHr);
        if (deltaHr <= 0) return BigDecimal.ZERO;

        double durationMin = durationSeconds / 60.0;
        double weighting = isMale
                ? 0.64 * Math.exp(1.92 * deltaHr)
                : 0.86 * Math.exp(1.67 * deltaHr);
        double trimp = durationMin * deltaHr * weighting;

        // Scale TRIMP to approximate TSS (× 100 / average weighting factor ~1.5)
        double hrTss = trimp * 100.0 / 1.5;
        return BigDecimal.valueOf(hrTss).setScale(1, RoundingMode.HALF_UP);
    }
}
