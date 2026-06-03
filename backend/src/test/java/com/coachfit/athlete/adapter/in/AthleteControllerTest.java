package com.coachfit.athlete.adapter.in;

import com.coachfit.athlete.application.port.in.*;
import com.coachfit.athlete.domain.exception.ProviderNotFoundException;
import com.coachfit.athlete.domain.model.AthleteProfile;
import com.coachfit.athlete.domain.model.OAuthConnection;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.athlete.domain.model.UserSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web layer slice test for {@link AthleteController}.
 *
 * <p>Security auto-config is excluded. The class-level {@link WithMockAthlete} annotation
 * (backed by a {@link org.springframework.security.test.context.support.WithSecurityContextFactory})
 * populates the Spring Security context with a real {@link com.coachfit.shared.adapter.in.security.jwt.UserPrincipal}
 * before each test.
 *
 * <p>{@link TestMvcConfig} registers {@link AuthenticationPrincipalArgumentResolver} so
 * {@code @AuthenticationPrincipal} resolves correctly without the full security filter chain.
 */
@WebMvcTest(
        controllers = AthleteController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration.class
        }
)
@Import({AthleteExceptionHandler.class, AthleteControllerTest.TestMvcConfig.class})
@TestPropertySource(properties = {
        "app.security.jwt-secret=test-secret-at-least-32-chars-long"
})
@WithMockAthlete
class AthleteControllerTest {

    /** Registers {@link AuthenticationPrincipalArgumentResolver} for the test MVC slice. */
    @TestConfiguration
    static class TestMvcConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new AuthenticationPrincipalArgumentResolver());
        }
    }

    @Autowired MockMvc      mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean GetAthleteProfileUseCase    getProfileUseCase;
    @MockitoBean UpdateAthleteProfileUseCase updateProfileUseCase;
    @MockitoBean GetSportZonesUseCase        getZonesUseCase;
    @MockitoBean UpsertSportZoneUseCase      upsertZoneUseCase;
    @MockitoBean GetConnectionsUseCase       getConnectionsUseCase;
    @MockitoBean DisconnectProviderUseCase   disconnectUseCase;

    // Fixed UUID matching WithMockAthlete default userId
    private static final UUID USER_ID    = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID PROFILE_ID = UUID.randomUUID();

    // ── Fixtures ──────────────────────────────────────────────────────────────

    private UserSummary freeUser() {
        return new UserSummary(USER_ID, "athlete@test.io", "Test Athlete", "athlete", "free", "{}");
    }

    private AthleteProfile profile() {
        return new AthleteProfile(
                PROFILE_ID, USER_ID, LocalDate.of(1990, 1, 1), "male",
                BigDecimal.valueOf(72.5), BigDecimal.valueOf(175.0),
                List.of("cycling", "running"), "intermediate", "cycling", "garmin",
                Instant.now(), Instant.now()
        );
    }

    private SportZone cyclingPowerZone() {
        List<SportZone.ZoneBand> bands = List.of(
                new SportZone.ZoneBand(1, "Recovery", 0, 145),
                new SportZone.ZoneBand(2, "Endurance", 146, 197),
                new SportZone.ZoneBand(3, "Tempo", 198, 236)
        );
        return new SportZone(UUID.randomUUID(), USER_ID, "cycling", "power",
                280, null, null, bands, LocalDate.now(), Instant.now());
    }

    private OAuthConnection stravaConnection() {
        return new OAuthConnection("strava", "active",
                Instant.now().minusSeconds(3600), false, Instant.now());
    }

    // ── GET /athlete ──────────────────────────────────────────────────────────

    @Test
    void getProfile_returns200WithProfileAndUser() throws Exception {
        when(getProfileUseCase.getProfile(USER_ID))
                .thenReturn(new GetAthleteProfileUseCase.Result(freeUser(), profile()));

        mockMvc.perform(get("/api/v1/athlete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(USER_ID.toString()))
                .andExpect(jsonPath("$.email").value("athlete@test.io"))
                .andExpect(jsonPath("$.tier").value("free"))
                .andExpect(jsonPath("$.profile.primarySport").value("cycling"))
                .andExpect(jsonPath("$.profile.weightKg").value(72.5));
    }

    @Test
    void getProfile_returns200WithNullProfileForNewUser() throws Exception {
        when(getProfileUseCase.getProfile(USER_ID))
                .thenReturn(new GetAthleteProfileUseCase.Result(freeUser(), null));

        mockMvc.perform(get("/api/v1/athlete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("athlete@test.io"))
                .andExpect(jsonPath("$.profile").doesNotExist());
    }

    // ── PUT /athlete ──────────────────────────────────────────────────────────

    @Test
    void updateProfile_returns200WithUpdatedProfile() throws Exception {
        when(updateProfileUseCase.update(any()))
                .thenReturn(new UpdateAthleteProfileUseCase.Result(freeUser(), profile()));

        mockMvc.perform(put("/api/v1/athlete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sports": ["cycling", "running"],
                                  "primarySport": "cycling",
                                  "experienceLevel": "intermediate",
                                  "weightKg": 72.5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.sports[0]").value("cycling"));
    }

    @Test
    void updateProfile_returns400WhenWeightOutOfRange() throws Exception {
        mockMvc.perform(put("/api/v1/athlete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": -5 }
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── GET /athlete/zones ────────────────────────────────────────────────────

    @Test
    void getZones_returns200WithZoneList() throws Exception {
        when(getZonesUseCase.getZones(USER_ID))
                .thenReturn(List.of(cyclingPowerZone()));

        mockMvc.perform(get("/api/v1/athlete/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sport").value("cycling"))
                .andExpect(jsonPath("$[0].zoneType").value("power"))
                .andExpect(jsonPath("$[0].ftp").value(280))
                .andExpect(jsonPath("$[0].zones[0].name").value("Recovery"));
    }

    @Test
    void getZones_returns200WithEmptyListWhenNoZones() throws Exception {
        when(getZonesUseCase.getZones(USER_ID)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/athlete/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── PUT /athlete/zones/{sport} ────────────────────────────────────────────

    @Test
    void upsertZone_returns200WithSavedZone() throws Exception {
        when(upsertZoneUseCase.upsert(any())).thenReturn(cyclingPowerZone());

        mockMvc.perform(put("/api/v1/athlete/zones/cycling")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "zoneType": "power",
                                  "ftp": 280,
                                  "zones": [
                                    { "zone": 1, "name": "Recovery", "min": 0, "max": 145 },
                                    { "zone": 2, "name": "Endurance", "min": 146, "max": 197 },
                                    { "zone": 3, "name": "Tempo", "min": 198, "max": 236 }
                                  ],
                                  "effectiveDate": "2026-05-01"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sport").value("cycling"))
                .andExpect(jsonPath("$.ftp").value(280));
    }

    @Test
    void upsertZone_returns400WhenZonesEmpty() throws Exception {
        mockMvc.perform(put("/api/v1/athlete/zones/cycling")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "zoneType": "power", "zones": [] }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upsertZone_returns400WhenZoneTypeBlank() throws Exception {
        mockMvc.perform(put("/api/v1/athlete/zones/cycling")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "zoneType": "",
                                  "zones": [
                                    { "zone": 1, "name": "Recovery", "min": 0, "max": 145 }
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upsertZone_returns400WhenServiceRejectsInvalidSport() throws Exception {
        when(upsertZoneUseCase.upsert(any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Unsupported sport: badSport"));

        mockMvc.perform(put("/api/v1/athlete/zones/badSport")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "zoneType": "power",
                                  "zones": [
                                    { "zone": 1, "name": "Recovery", "min": 0, "max": 145 }
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── GET /athlete/connections ──────────────────────────────────────────────

    @Test
    void getConnections_returns200WithConnectionList() throws Exception {
        when(getConnectionsUseCase.getConnections(USER_ID))
                .thenReturn(List.of(stravaConnection()));

        mockMvc.perform(get("/api/v1/athlete/connections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("strava"))
                .andExpect(jsonPath("$[0].syncStatus").value("active"))
                .andExpect(jsonPath("$[0].pushEnabled").value(false));
    }

    @Test
    void getConnections_returns200WithEmptyListWhenNoConnections() throws Exception {
        when(getConnectionsUseCase.getConnections(USER_ID)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/athlete/connections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── DELETE /athlete/connections/{provider} ────────────────────────────────

    @Test
    void disconnect_returns204OnSuccess() throws Exception {
        doNothing().when(disconnectUseCase).disconnect(USER_ID, "strava");

        mockMvc.perform(delete("/api/v1/athlete/connections/strava"))
                .andExpect(status().isNoContent());

        verify(disconnectUseCase).disconnect(USER_ID, "strava");
    }

    @Test
    void disconnect_returns404WhenProviderNotConnected() throws Exception {
        doThrow(new ProviderNotFoundException("unknown_provider"))
                .when(disconnectUseCase).disconnect(eq(USER_ID), eq("unknown_provider"));

        mockMvc.perform(delete("/api/v1/athlete/connections/unknown_provider"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }
}
