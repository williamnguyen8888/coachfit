package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.UnsupportedFileFormatException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Detects the format of an uploaded activity file via byte-level inspection.
 *
 * <h3>Detection strategy</h3>
 * <ol>
 *   <li><b>FIT</b> — Garmin FIT files start with a 12- or 14-byte header.
 *       Bytes 8–11 (0-indexed) contain the ASCII string ".FIT".</li>
 *   <li><b>TCX</b> — XML file whose root element is {@code TrainingCenterDatabase}.</li>
 *   <li><b>GPX</b> — XML file whose root element is {@code gpx}.</li>
 * </ol>
 *
 * <p>Format is detected from raw bytes rather than file extension to handle
 * mis-named files gracefully.
 */
@Component
public class FileFormatDetector {

    public enum Format { FIT, TCX, GPX }

    // FIT magic bytes at offset 8 (after the header length + protocol/profile version + data size)
    private static final byte[] FIT_MAGIC = ".FIT".getBytes(StandardCharsets.US_ASCII);

    /**
     * Detects the format of the given file bytes.
     *
     * @param filename  original filename (used in the exception message only)
     * @param fileBytes raw file content
     * @return detected {@link Format}
     * @throws UnsupportedFileFormatException if the format cannot be identified
     */
    public Format detect(String filename, byte[] fileBytes) {
        if (isFit(fileBytes)) return Format.FIT;
        String xmlHead = xmlHeader(fileBytes);
        if (xmlHead.contains("TrainingCenterDatabase")) return Format.TCX;
        if (xmlHead.contains("<gpx"))                  return Format.GPX;
        throw new UnsupportedFileFormatException(filename);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * FIT files have the 4-byte magic ".FIT" at offset 8 in the file header.
     * Header size can be 12 or 14 bytes; magic is always at byte 8.
     */
    private boolean isFit(byte[] bytes) {
        if (bytes.length < 12) return false;
        for (int i = 0; i < FIT_MAGIC.length; i++) {
            if (bytes[8 + i] != FIT_MAGIC[i]) return false;
        }
        return true;
    }

    /**
     * Returns the first 512 characters of the file as a string (UTF-8 best-effort).
     * Used to search for XML root element names without full parse.
     */
    private String xmlHeader(byte[] bytes) {
        int len = Math.min(bytes.length, 512);
        return new String(bytes, 0, len, StandardCharsets.UTF_8);
    }
}
