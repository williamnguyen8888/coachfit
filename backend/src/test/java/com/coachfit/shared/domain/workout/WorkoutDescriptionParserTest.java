package com.coachfit.shared.domain.workout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WorkoutDescriptionParserTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void parse_cyclingRepeatWithInlineRest() throws Exception {
        JsonNode steps = parse("""
                10min warmup z2
                3x10min 88-92% / 5min z1
                10min cooldown z1
                """, "cycling");

        assertThat(steps).hasSize(3);
        assertThat(steps.get(0).get("type").asText()).isEqualTo("warmup");
        assertThat(steps.get(0).at("/duration/value").asInt()).isEqualTo(600);
        assertThat(steps.get(0).at("/target/type").asText()).isEqualTo("power_zone");
        assertThat(steps.get(0).at("/target/zone").asInt()).isEqualTo(2);

        JsonNode repeat = steps.get(1);
        assertThat(repeat.get("type").asText()).isEqualTo("repeat");
        assertThat(repeat.get("count").asInt()).isEqualTo(3);
        assertThat(repeat.at("/steps/0/duration/value").asInt()).isEqualTo(600);
        assertThat(repeat.at("/steps/0/target/type").asText()).isEqualTo("power_pct");
        assertThat(repeat.at("/steps/0/target/min").asDouble()).isEqualTo(0.88);
        assertThat(repeat.at("/steps/0/target/max").asDouble()).isEqualTo(0.92);
        assertThat(repeat.at("/steps/1/type").asText()).isEqualTo("rest");
        assertThat(repeat.at("/steps/1/target/zone").asInt()).isEqualTo(1);

        assertThat(steps.get(2).get("type").asText()).isEqualTo("cooldown");
    }

    @Test
    void parse_repeatWithIndentedRestLine() throws Exception {
        JsonNode steps = parse("""
                - 4x8m threshold
                  3min recovery z1
                """, "cycling");

        assertThat(steps).hasSize(1);
        assertThat(steps.at("/0/type").asText()).isEqualTo("repeat");
        assertThat(steps.at("/0/count").asInt()).isEqualTo(4);
        assertThat(steps.at("/0/steps/0/duration/value").asInt()).isEqualTo(480);
        assertThat(steps.at("/0/steps/0/target/zone").asInt()).isEqualTo(4);
        assertThat(steps.at("/0/steps/1/type").asText()).isEqualTo("rest");
        assertThat(steps.at("/0/steps/1/duration/value").asInt()).isEqualTo(180);
    }

    @Test
    void parse_runningDistanceAndPace() throws Exception {
        JsonNode steps = parse("5x1km @ 4:30/km, 2min rest", "running");

        assertThat(steps).hasSize(1);
        assertThat(steps.at("/0/type").asText()).isEqualTo("repeat");
        assertThat(steps.at("/0/count").asInt()).isEqualTo(5);
        assertThat(steps.at("/0/steps/0/duration/type").asText()).isEqualTo("distance");
        assertThat(steps.at("/0/steps/0/duration/value").asInt()).isEqualTo(1000);
        assertThat(steps.at("/0/steps/0/target/type").asText()).isEqualTo("pace");
        assertThat(steps.at("/0/steps/0/target/min").asDouble()).isEqualTo(270.0);
        assertThat(steps.at("/0/steps/1/type").asText()).isEqualTo("rest");
    }

    @Test
    void parse_swimmingBareMetersAsDistance() throws Exception {
        JsonNode steps = parse("8x50m easy / 20s rest", "swimming");

        assertThat(steps.at("/0/steps/0/duration/type").asText()).isEqualTo("distance");
        assertThat(steps.at("/0/steps/0/duration/value").asInt()).isEqualTo(50);
        assertThat(steps.at("/0/steps/0/target/type").asText()).isEqualTo("pace_zone");
        assertThat(steps.at("/0/steps/0/target/zone").asInt()).isEqualTo(2);
    }

    @Test
    void parse_returnsEmptyForFreeTextNotes() {
        var parsed = WorkoutDescriptionParser.parseToStepsJson(
                "Run easy if you feel good, otherwise take the day off.",
                "running"
        );

        assertThat(parsed).isEmpty();
    }

    private static JsonNode parse(String text, String sport) throws Exception {
        String json = WorkoutDescriptionParser.parseToStepsJson(text, sport).orElseThrow();
        return MAPPER.readTree(json);
    }
}
