package com.coachfit.sync.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.sync.application.port.in.SyncWorkoutToGarminUseCase;
import com.coachfit.sync.application.port.out.GarminTrainingPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar")
public class GarminWorkoutSyncController {

    private final SyncWorkoutToGarminUseCase garminSyncUseCase;

    public GarminWorkoutSyncController(SyncWorkoutToGarminUseCase garminSyncUseCase) {
        this.garminSyncUseCase = garminSyncUseCase;
    }

    @PostMapping("/{id}/sync-garmin")
    public ResponseEntity<GarminSyncResponse> syncToGarmin(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        try {
            SyncWorkoutToGarminUseCase.SyncResult result =
                    garminSyncUseCase.syncToGarmin(id, principal.getUserId());

            return ResponseEntity.ok(new GarminSyncResponse(
                    result.garminWorkoutId(),
                    result.garminScheduledId(),
                    result.scheduledDate().toString()
            ));
        } catch (SyncWorkoutToGarminUseCase.GarminSyncException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (GarminTrainingPort.GarminTrainingException e) {
            if (e.getHttpStatus() == 401) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "User has no active Garmin connection. Please reconnect Garmin.");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Garmin Training API unavailable: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}/sync-garmin")
    public ResponseEntity<Void> removeFromGarmin(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        try {
            garminSyncUseCase.removeFromGarmin(id, principal.getUserId());
            return ResponseEntity.ok().build();
        } catch (SyncWorkoutToGarminUseCase.GarminSyncException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (GarminTrainingPort.GarminTrainingException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Garmin Training API error: " + e.getMessage());
        }
    }

    public record GarminSyncResponse(
            String garminWorkoutId,
            String garminScheduledId,
            String scheduledDate
    ) {}
}
