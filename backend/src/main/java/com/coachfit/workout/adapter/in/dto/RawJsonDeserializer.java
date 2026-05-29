package com.coachfit.workout.adapter.in.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.node.TreeTraversingParser;

import java.io.IOException;

/**
 * Jackson deserializer that captures a JSON value (object, array, scalar) as its
 * raw JSON string representation.
 *
 * <p>Used for the {@code steps} field in {@link WorkoutRequest} so the workout
 * steps array is preserved verbatim for JSONB storage without an intermediate
 * Java object model.
 */
public class RawJsonDeserializer extends StdDeserializer<String> {

    public RawJsonDeserializer() {
        super(String.class);
    }

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctx) throws IOException {
        return p.getCodec().readTree(p).toString();
    }
}
