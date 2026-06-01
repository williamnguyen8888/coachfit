package com.coachfit.sync.adapter.in;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;

/**
 * Servlet filter that verifies the Garmin webhook HMAC-SHA1 signature
 * on all incoming {@code /api/v1/webhooks/garmin/**} requests.
 *
 * <h3>Why a Filter (not in the Controller)?</h3>
 * <p>Spring's Jackson {@code @RequestBody} parsing consumes the {@code InputStream} —
 * by the time the controller runs, the raw bytes are gone. This filter wraps the
 * request in a {@link ContentCachingRequestWrapper} so the body can be read twice:
 * once for signature verification and again by Jackson for deserialization.
 *
 * <h3>Behavior</h3>
 * <ul>
 *   <li>Only applies to {@code /api/v1/webhooks/garmin/**} — all other paths pass through.</li>
 *   <li>Reads the raw body bytes → computes HMAC-SHA1 → compares with header.</li>
 *   <li>Returns {@code 401 Unauthorized} if verification fails.</li>
 *   <li>If verification passes, replaces the request with a caching wrapper so
 *       Jackson can read the body normally.</li>
 * </ul>
 *
 * <p>See docs/06-sync-engine-spec.md §Garmin Push Callback Verification.
 */
class GarminWebhookSignatureFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(GarminWebhookSignatureFilter.class);

    private static final String GARMIN_WEBHOOK_PATH_PREFIX = "/api/v1/webhooks/garmin";

    private final GarminSignatureVerifier signatureVerifier;

    GarminWebhookSignatureFilter(GarminSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only apply to Garmin webhook paths
        return !request.getRequestURI().startsWith(GARMIN_WEBHOOK_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Wrap request to allow body to be read multiple times
        ContentCachingRequestWrapper cachedRequest = new ContentCachingRequestWrapper(request);

        // Read body eagerly so we have bytes for signature verification
        byte[] body = StreamUtils.copyToByteArray(cachedRequest.getInputStream());
        // Trigger the ContentCachingRequestWrapper to cache the body
        // (reading InputStream above caches it, subsequent reads from getContentAsByteArray())

        String signatureHeader = request.getHeader(GarminSignatureVerifier.signatureHeaderName());

        if (!signatureVerifier.verify(body, signatureHeader)) {
            log.warn("Garmin webhook signature verification FAILED for URI={} remoteAddr={}",
                    request.getRequestURI(), request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Invalid Garmin webhook signature\"}");
            return;
        }

        log.debug("Garmin webhook signature verified OK for URI={}", request.getRequestURI());
        filterChain.doFilter(cachedRequest, response);
    }
}
