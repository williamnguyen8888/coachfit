package com.coachfit.calendar.adapter.in;

import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.ExternalEventCommand;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.ExternalEventView;
import com.coachfit.calendar.application.port.in.ManageExternalCalendarEventsUseCase.UpsertMode;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AthleteEventsController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration.class
        }
)
@Import(AthleteEventsControllerTest.TestMvcConfig.class)
@WithMockCalendarAthlete
class AthleteEventsControllerTest {

    @TestConfiguration
    static class TestMvcConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new AuthenticationPrincipalArgumentResolver());
        }
    }

    @Autowired MockMvc mockMvc;

    @MockitoBean ManageExternalCalendarEventsUseCase useCase;

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID EVENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID WORKOUT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");

    @Test
    void create_athleteZeroUsesAuthenticatedUserAndIntervalsStylePayload() throws Exception {
        when(useCase.create(eq(USER_ID), eq("TrainingPeaks"), any(), eq(UpsertMode.EXTERNAL_ID)))
                .thenReturn(view());

        mockMvc.perform(post("/api/v1/athlete/0/events")
                        .queryParam("upsert", "true")
                        .header("X-CoachFit-Source", "TrainingPeaks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "WORKOUT",
                                  "start_date_local": "2026-06-10T00:00:00",
                                  "name": "Tempo Ride",
                                  "type": "Ride",
                                  "moving_time": 3600,
                                  "icu_training_load": 80,
                                  "external_id": "tp-42"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(EVENT_ID.toString()))
                .andExpect(jsonPath("$.athlete_id").value(USER_ID.toString()))
                .andExpect(jsonPath("$.start_date_local").value("2026-06-10T00:00:00"))
                .andExpect(jsonPath("$.category").value("WORKOUT"))
                .andExpect(jsonPath("$.external_id").value("tp-42"));

        ArgumentCaptor<ExternalEventCommand> captor = ArgumentCaptor.forClass(ExternalEventCommand.class);
        verify(useCase).create(eq(USER_ID), eq("TrainingPeaks"), captor.capture(), eq(UpsertMode.EXTERNAL_ID));
        assertThat(captor.getValue().startDateLocal()).isEqualTo("2026-06-10T00:00:00");
        assertThat(captor.getValue().type()).isEqualTo("Ride");
        assertThat(captor.getValue().movingTime()).isEqualTo(3600);
        assertThat(captor.getValue().trainingLoad()).isEqualByComparingTo("80");
        assertThat(captor.getValue().externalId()).isEqualTo("tp-42");
    }

    @Test
    void create_upsertOnUidUsesUidModeAndPassesUid() throws Exception {
        when(useCase.create(eq(USER_ID), isNull(), any(), eq(UpsertMode.UID)))
                .thenReturn(view());

        mockMvc.perform(post("/api/v1/athlete/0/events")
                        .queryParam("upsertOnUid", "true")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "WORKOUT",
                                  "start_date_local": "2026-06-10",
                                  "name": "Tempo Ride",
                                  "uid": "calendar-uid-42",
                                  "external_id": "tp-42"
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<ExternalEventCommand> captor = ArgumentCaptor.forClass(ExternalEventCommand.class);
        verify(useCase).create(eq(USER_ID), isNull(), captor.capture(), eq(UpsertMode.UID));
        assertThat(captor.getValue().uid()).isEqualTo("calendar-uid-42");
        assertThat(captor.getValue().externalId()).isEqualTo("tp-42");
    }

    @Test
    void deleteRange_splitsCommaSeparatedCategoriesAndReturnsDeletedCount() throws Exception {
        when(useCase.deleteRange(
                eq(USER_ID),
                eq("trainingpeaks"),
                eq(LocalDate.of(2026, 6, 1)),
                eq(LocalDate.of(2026, 6, 7)),
                eq(List.of("WORKOUT", "NOTE"))))
                .thenReturn(2);

        mockMvc.perform(delete("/api/v1/athlete/0/events")
                        .queryParam("oldest", "2026-06-01")
                        .queryParam("newest", "2026-06-07")
                        .queryParam("category", "WORKOUT,NOTE")
                        .queryParam("source", "trainingpeaks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventsDeleted").value(2));
    }

    @Test
    void create_rejectsDifferentAthleteId() throws Exception {
        mockMvc.perform(post("/api/v1/athlete/00000000-0000-0000-0000-000000000099/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "category": "WORKOUT", "start_date_local": "2026-06-10", "name": "Tempo" }
                                """))
                .andExpect(status().isNotFound());
    }

    private static ExternalEventView view() {
        return new ExternalEventView(
                EVENT_ID,
                USER_ID,
                LocalDate.of(2026, 6, 10),
                "WORKOUT",
                "Tempo Ride",
                "Imported by test",
                "cycling",
                3600,
                BigDecimal.valueOf(80),
                WORKOUT_ID,
                "calendar-uid-42",
                "tp-42",
                "trainingpeaks",
                "planned"
        );
    }
}

@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCalendarAthlete.Factory.class)
@interface WithMockCalendarAthlete {

    String userId() default "00000000-0000-0000-0000-000000000001";
    String email() default "athlete@test.io";
    String role() default "athlete";
    String tier() default "free";

    class Factory implements WithSecurityContextFactory<WithMockCalendarAthlete> {
        @Override
        public SecurityContext createSecurityContext(WithMockCalendarAthlete annotation) {
            UserPrincipal principal = new UserPrincipal(
                    UUID.fromString(annotation.userId()),
                    annotation.email(),
                    annotation.role(),
                    annotation.tier()
            );
            var token = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities());
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(token);
            return ctx;
        }
    }
}
