package com.coachfit.wellness.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.wellness.adapter.in.dto.WellnessRequest;
import com.coachfit.wellness.adapter.in.dto.WellnessResponse;
import com.coachfit.wellness.application.port.in.WellnessUseCase;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for wellness log endpoints.
 *
 * <pre>
 * GET  /api/v1/wellness?from=...&amp;to=...  — list wellness entries
 * POST /api/v1/wellness                   — log manual wellness for today
 * PUT  /api/v1/wellness/{date}            — update/merge wellness for a date
 * </pre>
 *
 * <p>Upsert semantics: provider-pushed data (Garmin, COROS, Polar) is not overwritten
 * by manual entries — only explicitly provided fields are merged. The {@code fieldSources}
 * JSON in the response shows which source provided each field.
 */
@RestController
@RequestMapping("/api/v1/wellness")
public class WellnessController {

    private final WellnessUseCase wellnessUseCase;

    public WellnessController(WellnessUseCase wellnessUseCase) {
        this.wellnessUseCase = wellnessUseCase;
    }

    // ── GET /wellness ─────────────────────────────────────────────────────────

    /**
     * Returns wellness log entries in the specified date range, ordered date DESC.
     * Defaults to the last 30 days if no range is provided.
     *
     * @param from ISO date lower bound (inclusive), e.g. "2025-03-01"
     * @param to   ISO date upper bound (inclusive), e.g. "2025-03-31"
     */
    @GetMapping
    public ResponseEntity<List<WellnessResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<WellnessUseCase.WellnessEntry> entries =
                wellnessUseCase.list(principal.getUserId(), from, to);
        return ResponseEntity.ok(WellnessResponse.fromList(entries));
    }

    // ── POST /wellness ────────────────────────────────────────────────────────

    /**
     * Logs a manual wellness entry for today (or an optionally specified date in the body).
     * Null fields in the request body are ignored; existing non-null values are preserved.
     * Returns 201 with the merged entry.
     */
    @PostMapping
    public ResponseEntity<WellnessResponse> log(
            @RequestBody WellnessRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        WellnessUseCase.WellnessEntry entry =
                wellnessUseCase.log(principal.getUserId(), null, req.toInput());
        return ResponseEntity.status(201).body(WellnessResponse.from(entry));
    }

    // ── PUT /wellness/{date} ──────────────────────────────────────────────────

    /**
     * Updates (merges) the wellness entry for a specific date.
     * Only non-null fields in the request body are applied.
     * Returns 200 with the merged entry, or 404 if no entry exists for the date.
     */
    @PutMapping("/{date}")
    public ResponseEntity<WellnessResponse> update(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody WellnessRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        WellnessUseCase.WellnessEntry entry =
                wellnessUseCase.update(principal.getUserId(), date, req.toInput());
        return ResponseEntity.ok(WellnessResponse.from(entry));
    }
}
