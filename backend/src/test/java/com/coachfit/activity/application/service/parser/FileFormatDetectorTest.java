package com.coachfit.activity.application.service.parser;

import com.coachfit.activity.domain.exception.UnsupportedFileFormatException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileFormatDetectorTest {

    private final FileFormatDetector detector = new FileFormatDetector();

    @Test
    void detect_fitByMagicBytes() {
        byte[] bytes = new byte[14];
        System.arraycopy(".FIT".getBytes(StandardCharsets.US_ASCII), 0, bytes, 8, 4);

        assertThat(detector.detect("ride.fit", bytes)).isEqualTo(FileFormatDetector.Format.FIT);
    }

    @Test
    void detect_tcxWithUtf8Bom() {
        byte[] bytes = ("\uFEFF<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<TrainingCenterDatabase xmlns=\"http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2\"/>")
                .getBytes(StandardCharsets.UTF_8);

        assertThat(detector.detect("run.xml", bytes)).isEqualTo(FileFormatDetector.Format.TCX);
    }

    @Test
    void detect_gpxWithLeadingWhitespace() {
        byte[] bytes = ("\n  <?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<gpx version=\"1.1\" creator=\"CoachFit\" xmlns=\"http://www.topografix.com/GPX/1/1\"/>")
                .getBytes(StandardCharsets.UTF_8);

        assertThat(detector.detect("track.xml", bytes)).isEqualTo(FileFormatDetector.Format.GPX);
    }

    @Test
    void detect_unknownBytes_throwsUnsupportedFileFormatException() {
        assertThatThrownBy(() -> detector.detect("notes.txt", "hello".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(UnsupportedFileFormatException.class);
    }
}
