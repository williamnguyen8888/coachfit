package com.coachfit.activity.domain.model;

import java.util.List;

/**
 * Time-series arrays extracted from a parsed activity file.
 *
 * <p>Every non-null array shares the same index position.
 * Arrays may be null when the data source does not provide that stream.
 *
 * <ul>
 *   <li>{@code timestamps}  — seconds from activity start (always present if any stream exists)</li>
 *   <li>{@code heartRate}   — bpm</li>
 *   <li>{@code power}       — watts</li>
 *   <li>{@code cadence}     — rpm</li>
 *   <li>{@code speed}       — m/s</li>
 *   <li>{@code altitude}    — meters</li>
 *   <li>{@code latitude}    — decimal degrees</li>
 *   <li>{@code longitude}   — decimal degrees</li>
 *   <li>{@code distance}    — cumulative meters</li>
 *   <li>{@code temperature} — Celsius</li>
 * </ul>
 */
public record ParsedStreams(
        List<Integer>  timestamps,
        List<Short>    heartRate,
        List<Short>    power,
        List<Short>    cadence,
        List<Float>    speed,
        List<Float>    altitude,
        List<Double>   latitude,
        List<Double>   longitude,
        List<Float>    distance,
        List<Short>    temperature,
        List<Float>    grade
) {
    /** Returns an empty (all-null) stream set. */
    public static ParsedStreams empty() {
        return new ParsedStreams(null, null, null, null, null, null, null, null, null, null, null);
    }
}
