package com.coachfit.wellness.application.service;

import com.coachfit.shared.domain.event.ActivityCreatedEvent;
import com.coachfit.shared.domain.event.ActivityDeletedEvent;
import com.coachfit.shared.domain.SportNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Spring event listener that triggers PMC (CTL/ATL/TSB) recalculation after
 * every activity create or delete operation.
 *
 * <p>Runs in a new transaction (AFTER_COMMIT) so that the activity row is
 * guaranteed to exist in the DB when the TSS query runs — avoiding race conditions
 * that would return 0 TSS for newly imported activities.
 *
 * <p>Delegates all computation to {@link TrainingLoadCalculationService}.
 */
@Component
public class TrainingLoadEventListener {

    private static final Logger log = LoggerFactory.getLogger(TrainingLoadEventListener.class);

    private final TrainingLoadCalculationService calculationService;

    public TrainingLoadEventListener(TrainingLoadCalculationService calculationService) {
        this.calculationService = calculationService;
    }

    /**
     * Recalculates the PMC chart after a new activity is committed to the DB.
     *
     * <p>The {@code activityDate} is derived from {@code event.startedAt()} in UTC
     * (consistent with the {@code queryDailyTss} query which also uses UTC).
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onActivityCreated(ActivityCreatedEvent event) {
        String normalizedSport = SportNormalizer.normalize(event.sport());
        LocalDate activityDate = event.startedAt()
                .atZone(ZoneOffset.UTC)
                .toLocalDate();

        log.info("TrainingLoad recalc triggered: userId={} sport={} date={}",
                event.userId(), normalizedSport, activityDate);

        calculationService.recalculateFrom(event.userId(), normalizedSport, activityDate);
    }

    /**
     * Recalculates the PMC chart after an activity is soft-deleted.
     *
     * <p>The date is taken from the event; if unavailable (legacy events), falls back to today
     * which forces a full recalc from the most recent training_load entry.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onActivityDeleted(ActivityDeletedEvent event) {
        // For deletions, we re-run from the deleted activity's date so that
        // subsequent days' CTL/ATL are corrected to reflect the removed TSS.
        LocalDate deletedDate = event.startedAt() != null
                ? event.startedAt().atZone(ZoneOffset.UTC).toLocalDate()
                : LocalDate.now();
        String normalizedSport = event.sport() != null
                ? SportNormalizer.normalize(event.sport())
                : "all";

        log.info("TrainingLoad recalc triggered (delete): userId={} sport={} date={}",
                event.userId(), normalizedSport, deletedDate);

        calculationService.recalculateFrom(event.userId(), normalizedSport, deletedDate);
    }
}
