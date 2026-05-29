package com.coachfit.activity.adapter.in;

import com.coachfit.activity.adapter.in.dto.ActivityResponse;
import com.coachfit.activity.application.port.in.UploadActivityUseCase;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * REST controller for activity file upload.
 *
 * <pre>
 * POST /api/v1/activities/upload
 *   Content-Type: multipart/form-data
 *   Authorization: Bearer &lt;JWT&gt;
 *
 *   file: (binary .fit / .tcx / .gpx)
 *
 * Response 201 — ActivityResponse (JSON)
 * Response 400 — UNSUPPORTED_FORMAT or PARSE_ERROR
 * Response 409 — DUPLICATE (with existingId)
 * </pre>
 *
 * <p>Authentication is enforced by the JWT filter chain configured in
 * {@code SecurityConfig} — no additional annotation needed.
 */
@RestController
@RequestMapping("/api/v1/activities")
public class ActivityUploadController {

    private final UploadActivityUseCase uploadUseCase;

    public ActivityUploadController(UploadActivityUseCase uploadUseCase) {
        this.uploadUseCase = uploadUseCase;
    }

    /**
     * Accepts a single activity file upload (FIT / TCX / GPX).
     *
     * @param file      the multipart file part named {@code "file"}
     * @param principal authenticated user extracted from JWT
     * @return 201 with the normalised activity, or 4xx on error
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<ActivityResponse> upload(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {

        byte[] fileBytes = file.getBytes();
        String filename  = file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "upload";

        UploadActivityUseCase.ActivitySummary summary =
                uploadUseCase.upload(principal.getUserId(), filename, fileBytes);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ActivityResponse.from(summary));
    }
}
