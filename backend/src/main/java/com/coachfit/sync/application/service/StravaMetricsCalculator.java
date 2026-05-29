package com.coachfit.sync.application.service;

import java.math.BigDecimal;
import java.math.MathContext;
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
     * Training Stress Score.
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
     * @param maxHr           max heart rate during activity (used as proxy for athlete maxHR if HR zones not set)
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
