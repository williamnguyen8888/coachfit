package com.coachfit.calendar.application.service;

import com.coachfit.calendar.application.port.out.CalendarEventPersistencePort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nightly scheduled job that auto-skips past planned calendar events.
 *
 * <p>Per docs/05-api-design.md:
 * <blockquote>
 *   Auto-skip rule: Calendar events with status='planned' and date &lt; today
 *   are auto-marked 'skipped' by a scheduled job running at 23:59 UTC daily.
 *   Coach can override.
 * </blockquote>
 *
 * <p>The scheduler runs at 23:59 UTC every day via a cron expression.
 * It delegates directly to {@link CalendarEventPersistencePort#autoSkipPastPlanned()}
 * which executes a single bulk UPDATE — no per-event processing overhead.
 *
 * <p>Spring Scheduling must be enabled via {@code @EnableScheduling} on the
 * application class or a {@code @Configuration} class.
 */
@Component
public class CalendarAutoSkipScheduler {

    private static final Logger log = LoggerFactory.getLogger(CalendarAutoSkipScheduler.class);

    private final CalendarEventPersistencePort port;

    public CalendarAutoSkipScheduler(CalendarEventPersistencePort port) {
        this.port = port;
    }

    /**
     * Runs at 23:59 UTC every day.
     *
     * <p>Marks all {@code planned} events whose {@code date} is before today as
     * {@code skipped}. Returns the number of rows updated (logged at INFO level).
     */
    @Scheduled(cron = "0 59 23 * * *", zone = "UTC")
    @Transactional
    public void autoSkipPastEvents() {
        int skipped = port.autoSkipPastPlanned();
        if (skipped > 0) {
            log.info("Auto-skip: marked {} planned event(s) as skipped", skipped);
        } else {
            log.debug("Auto-skip: no past planned events to skip");
        }
    }
}
