package com.coachfit.shared.domain.workout;

/**
 * Zone configuration context for FIT export target resolution.
 *
 * <p>Extracted from the athlete module's {@code SportZone} records and passed
 * into {@link FitEncoder} so that domain code has no dependency on the athlete module.
 *
 * @param ftpWatts  functional threshold power in watts (used for power_pct targets);
 *                  defaults to 200W when not configured
 * @param lthrBpm       lactate threshold heart rate in bpm (used for hr_pct targets);
 *                      defaults to 160 bpm when not configured
 * @param thresholdPace threshold pace in seconds per km or per 100m;
 *                      defaults to 300 seconds when not configured
 */
public record ZoneContext(int ftpWatts, int lthrBpm, int thresholdPace) {

    /** Returns a default context when the user has not configured any zones. */
    public static ZoneContext defaults() {
        return new ZoneContext(200, 160, 300);
    }
}
