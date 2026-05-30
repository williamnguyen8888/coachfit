package com.coachfit.wellness.application.service;

import com.coachfit.wellness.application.port.in.WellnessUseCase;
import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort;
import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort.WellnessFields;
import com.coachfit.wellness.application.port.out.WellnessLogPersistencePort.WellnessSnapshot;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link WellnessUseCase}.
 *
 * <p>All manual writes use the {@code "manual"} source. Upsert semantics from the
 * persistence layer guarantee that wearable-pushed data (Garmin, COROS, Polar)
 * is not silently overwritten — only fields explicitly provided by the user are merged.
 */
@Service
public class WellnessService implements WellnessUseCase {

    private static final String MANUAL_SOURCE = "manual";

    private final WellnessLogPersistencePort port;

    public WellnessService(WellnessLogPersistencePort port) {
        this.port = port;
    }

    // ── List ──────────────────────────────────────────────────────────────────

    @Override
    public List<WellnessEntry> list(UUID userId, LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'from' date must not be after 'to' date");
        }
        // Default to last 30 days if no range provided
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(29);

        return port.listRange(userId, effectiveFrom, effectiveTo).stream()
                .map(WellnessService::toEntry)
                .toList();
    }

    // ── Log (POST) ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public WellnessEntry log(UUID userId, LocalDate date, WellnessInput input) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        validateInput(input);

        port.upsert(userId, effectiveDate, MANUAL_SOURCE, toFields(input));

        return port.findByUserAndDate(userId, effectiveDate)
                .map(WellnessService::toEntry)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to retrieve wellness entry after save"));
    }

    // ── Update (PUT) ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public WellnessEntry update(UUID userId, LocalDate date, WellnessInput input) {
        validateInput(input);
        port.upsert(userId, date, MANUAL_SOURCE, toFields(input));

        return port.findByUserAndDate(userId, date)
                .map(WellnessService::toEntry)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Wellness entry not found for date: " + date));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void validateInput(WellnessInput input) {
        if (input.mood() != null && (input.mood() < 1 || input.mood() > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mood must be 1-5");
        }
        if (input.rpe() != null && (input.rpe() < 1 || input.rpe() > 10)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rpe must be 1-10");
        }
        if (input.sleepQuality() != null && (input.sleepQuality() < 1 || input.sleepQuality() > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sleepQuality must be 1-5");
        }
        if (input.fatigue() != null && (input.fatigue() < 1 || input.fatigue() > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fatigue must be 1-5");
        }
        if (input.soreness() != null && (input.soreness() < 1 || input.soreness() > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "soreness must be 1-5");
        }
        if (input.stressLevel() != null && (input.stressLevel() < 1 || input.stressLevel() > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stressLevel must be 1-5");
        }
    }

    private static WellnessFields toFields(WellnessInput input) {
        // Build fieldSources JSON: mark each provided field as "manual"
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        if (input.mood()         != null) { sb.append(first ? "" : ",").append("\"mood\":\"manual\"");          first = false; }
        if (input.rpe()          != null) { sb.append(first ? "" : ",").append("\"rpe\":\"manual\"");           first = false; }
        if (input.sleepQuality() != null) { sb.append(first ? "" : ",").append("\"sleep_quality\":\"manual\""); first = false; }
        if (input.sleepHours()   != null) { sb.append(first ? "" : ",").append("\"sleep_hours\":\"manual\"");   first = false; }
        if (input.fatigue()      != null) { sb.append(first ? "" : ",").append("\"fatigue\":\"manual\"");       first = false; }
        if (input.soreness()     != null) { sb.append(first ? "" : ",").append("\"soreness\":\"manual\"");      first = false; }
        if (input.stressLevel()  != null) { sb.append(first ? "" : ",").append("\"stress_level\":\"manual\""); first = false; }
        if (input.restingHr()    != null) { sb.append(first ? "" : ",").append("\"resting_hr\":\"manual\"");   first = false; }
        if (input.hrv()          != null) { sb.append(first ? "" : ",").append("\"hrv\":\"manual\"");           first = false; }
        if (input.weightKg()     != null) { sb.append(first ? "" : ",").append("\"weight_kg\":\"manual\"");     first = false; }
        if (input.notes()        != null) { sb.append(first ? "" : ",").append("\"notes\":\"manual\"");         first = false; }
        sb.append("}");

        return new WellnessFields(
                input.mood(), input.rpe(), input.sleepQuality(), input.sleepHours(),
                input.fatigue(), input.soreness(), input.stressLevel(),
                input.restingHr(), input.hrv(), input.weightKg(), input.notes(),
                sb.toString());
    }

    private static WellnessEntry toEntry(WellnessSnapshot s) {
        return new WellnessEntry(
                s.date(), s.source(), s.mood(), s.rpe(), s.sleepQuality(),
                s.sleepHours(), s.fatigue(), s.soreness(), s.stressLevel(),
                s.restingHr(), s.hrv(), s.weightKg(), s.notes(), s.fieldSources());
    }
}
