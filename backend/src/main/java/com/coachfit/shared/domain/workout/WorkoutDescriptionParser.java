package com.coachfit.shared.domain.workout;

import com.coachfit.shared.domain.SportNormalizer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic parser for structured workout text.
 *
 * <p>The parser intentionally accepts a small, explicit grammar. It returns empty
 * when any non-empty line cannot be parsed, so callers can reject or fallback
 * without storing guessed workout structure.
 */
public final class WorkoutDescriptionParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Pattern BULLET_PREFIX =
            Pattern.compile("^(?:[-*]\\s+|\\d+[.)]\\s+)");
    private static final Pattern REPEAT_PREFIX =
            Pattern.compile("^(\\d{1,2})\\s*x\\s*(.+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DURATION =
            Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(hours?|hrs?|hr|h|minutes?|mins?|min|seconds?|secs?|sec|kilometers?|kilometres?|kms?|km|meters?|metres?|m|s)\\b",
                    Pattern.CASE_INSENSITIVE);
    private static final Pattern ZONE =
            Pattern.compile("\\b(?:z|zone\\s*)([1-7])\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern PERCENT =
            Pattern.compile("\\b(\\d+(?:\\.\\d+)?)(?:\\s*-\\s*(\\d+(?:\\.\\d+)?))?\\s*%(?=$|\\s|[,;/])");
    private static final Pattern WATTS =
            Pattern.compile("\\b(\\d+)(?:\\s*-\\s*(\\d+))?\\s*w\\b");
    private static final Pattern BPM =
            Pattern.compile("\\b(\\d+)(?:\\s*-\\s*(\\d+))?\\s*bpm\\b");
    private static final Pattern RPE =
            Pattern.compile("\\brpe\\s*(\\d+(?:\\.\\d+)?)(?:\\s*-\\s*(\\d+(?:\\.\\d+)?))?\\b");
    private static final Pattern PACE_RANGE =
            Pattern.compile("\\b(\\d{1,2}:\\d{2})\\s*(?:-|to)\\s*(\\d{1,2}:\\d{2})(?:\\s*/\\s*(?:km|100m))?\\b");
    private static final Pattern PACE_SINGLE =
            Pattern.compile("\\b(\\d{1,2}:\\d{2})\\s*/\\s*(?:km|100m)\\b");

    private WorkoutDescriptionParser() {
    }

    public static Optional<String> parseToStepsJson(String description, String sport) {
        List<ParsedLine> lines = lines(description);
        if (lines.isEmpty()) {
            return Optional.empty();
        }

        String canonicalSport = SportNormalizer.canonical(sport);
        ArrayNode steps = MAPPER.createArrayNode();

        for (int i = 0; i < lines.size(); i++) {
            ParsedLine line = lines.get(i);
            Optional<ObjectNode> repeat = parseRepeat(line.text(), canonicalSport, null);
            if (repeat.isPresent()) {
                String remainder = repeatRemainder(line.text());
                if (!hasInlineRest(remainder) && i + 1 < lines.size() && lines.get(i + 1).indented()) {
                    Optional<ObjectNode> groupedRepeat = parseRepeat(line.text(), canonicalSport, lines.get(i + 1).text());
                    if (groupedRepeat.isPresent()) {
                        steps.add(groupedRepeat.get());
                        i++;
                        continue;
                    }
                }
                steps.add(repeat.get());
                continue;
            }

            Optional<ObjectNode> single = parseSegment(line.text(), canonicalSport, null);
            if (single.isEmpty()) {
                return Optional.empty();
            }
            steps.add(single.get());
        }

        try {
            return Optional.of(MAPPER.writeValueAsString(steps));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static Optional<ObjectNode> parseRepeat(String text, String sport, String groupedRest) {
        Matcher matcher = REPEAT_PREFIX.matcher(canonical(text));
        if (!matcher.matches()) {
            return Optional.empty();
        }

        int count = Integer.parseInt(matcher.group(1));
        if (count < 1 || count > 99) {
            return Optional.empty();
        }

        int x = canonical(text).indexOf('x');
        String remainder = x >= 0 ? canonical(text).substring(x + 1).trim() : matcher.group(2);
        SplitRepeat split = splitRepeatRemainder(remainder);
        String restPart = split.restPart() != null ? split.restPart() : groupedRest;

        Optional<ObjectNode> work = parseSegment(split.workPart(), sport, "work");
        if (work.isEmpty()) {
            return Optional.empty();
        }

        ObjectNode repeat = MAPPER.createObjectNode();
        repeat.put("type", "repeat");
        repeat.put("count", count);
        ArrayNode inner = MAPPER.createArrayNode();
        inner.add(work.get());

        if (restPart != null && !restPart.isBlank()) {
            Optional<ObjectNode> rest = parseSegment(restPart, sport, "rest");
            if (rest.isEmpty()) {
                return Optional.empty();
            }
            inner.add(rest.get());
        }

        repeat.set("steps", inner);
        return Optional.of(repeat);
    }

    private static Optional<ObjectNode> parseSegment(String text, String sport, String defaultType) {
        String canonical = canonical(text);
        Matcher durationMatcher = DURATION.matcher(canonical);
        if (!durationMatcher.find()) {
            return Optional.empty();
        }

        double amount = parseNumber(durationMatcher.group(1));
        String unit = durationMatcher.group(2).toLowerCase(Locale.ROOT);
        DurationValue duration = toDuration(amount, unit, sport);
        if (duration == null) {
            return Optional.empty();
        }

        String type = defaultType != null ? defaultType : detectStepType(canonical);
        ObjectNode step = MAPPER.createObjectNode();
        step.put("type", type);

        ObjectNode durationNode = MAPPER.createObjectNode();
        durationNode.put("type", duration.type());
        durationNode.put("value", duration.value());
        step.set("duration", durationNode);
        step.set("target", parseTarget(canonical, sport, type));
        return Optional.of(step);
    }

    private static ObjectNode parseTarget(String canonical, String sport, String stepType) {
        Optional<ObjectNode> pace = paceTarget(canonical);
        if (pace.isPresent()) {
            return pace.get();
        }

        Optional<ObjectNode> watts = rangeTarget(canonical, WATTS, "power_watts", 1.0);
        if (watts.isPresent()) {
            return watts.get();
        }

        Optional<ObjectNode> bpm = rangeTarget(canonical, BPM, "hr_bpm", 1.0);
        if (bpm.isPresent()) {
            return bpm.get();
        }

        Optional<ObjectNode> rpe = rangeTarget(canonical, RPE, "rpe", 1.0);
        if (rpe.isPresent()) {
            return rpe.get();
        }

        Matcher percent = PERCENT.matcher(canonical);
        if (percent.find()) {
            double min = parseNumber(percent.group(1)) / 100.0;
            double max = percent.group(2) != null ? parseNumber(percent.group(2)) / 100.0 : min;
            return minMaxTarget(percentTargetType(sport), min, max);
        }

        Matcher zone = ZONE.matcher(canonical);
        if (zone.find()) {
            int value = Integer.parseInt(zone.group(1));
            Optional<ObjectNode> zoneTarget = zoneTarget(sport, value);
            if (zoneTarget.isPresent()) {
                return zoneTarget.get();
            }
        }

        Optional<Integer> keywordZone = keywordZone(canonical, stepType);
        if (keywordZone.isPresent()) {
            Optional<ObjectNode> keywordTarget = zoneTarget(sport, keywordZone.get());
            if (keywordTarget.isPresent()) {
                return keywordTarget.get();
            }
        }

        ObjectNode open = MAPPER.createObjectNode();
        open.put("type", "open");
        return open;
    }

    private static Optional<ObjectNode> paceTarget(String canonical) {
        Matcher range = PACE_RANGE.matcher(canonical);
        if (range.find()) {
            return Optional.of(minMaxTarget("pace", paceSeconds(range.group(1)), paceSeconds(range.group(2))));
        }
        Matcher single = PACE_SINGLE.matcher(canonical);
        if (single.find()) {
            double seconds = paceSeconds(single.group(1));
            return Optional.of(minMaxTarget("pace", seconds, seconds));
        }
        return Optional.empty();
    }

    private static Optional<ObjectNode> rangeTarget(String canonical, Pattern pattern,
                                                   String type, double divisor) {
        Matcher matcher = pattern.matcher(canonical);
        if (!matcher.find()) {
            return Optional.empty();
        }
        double min = parseNumber(matcher.group(1)) / divisor;
        double max = matcher.group(2) != null ? parseNumber(matcher.group(2)) / divisor : min;
        return Optional.of(minMaxTarget(type, min, max));
    }

    private static ObjectNode minMaxTarget(String type, double min, double max) {
        ObjectNode target = MAPPER.createObjectNode();
        target.put("type", type);
        target.put("min", min);
        target.put("max", max);
        return target;
    }

    private static Optional<ObjectNode> zoneTarget(String sport, int zone) {
        String targetType;
        int maxZone;
        switch (sport) {
            case "cycling" -> {
                targetType = "power_zone";
                maxZone = 7;
            }
            case "running", "swimming" -> {
                targetType = "pace_zone";
                maxZone = 5;
            }
            default -> {
                targetType = "hr_zone";
                maxZone = 5;
            }
        }
        if (zone < 1 || zone > maxZone) {
            return Optional.empty();
        }
        ObjectNode target = MAPPER.createObjectNode();
        target.put("type", targetType);
        target.put("zone", zone);
        return Optional.of(target);
    }

    private static Optional<Integer> keywordZone(String canonical, String stepType) {
        if ("rest".equals(stepType) || containsAny(canonical, "recovery", "recover", "rest", "nghi")) {
            return Optional.of(1);
        }
        if (containsAny(canonical, "easy", "endurance", "aerobic")) {
            return Optional.of(2);
        }
        if (containsAny(canonical, "tempo")) {
            return Optional.of(3);
        }
        if (containsAny(canonical, "threshold", "sweet spot", "sweetspot")) {
            return Optional.of(4);
        }
        if (containsAny(canonical, "vo2", "vo2max")) {
            return Optional.of(5);
        }
        return Optional.empty();
    }

    private static String percentTargetType(String sport) {
        return "cycling".equals(sport) ? "power_pct" : "hr_pct";
    }

    private static String detectStepType(String canonical) {
        if (containsAny(canonical, "warmup", "warm up", "wu", "khoi dong")) {
            return "warmup";
        }
        if (containsAny(canonical, "cooldown", "cool down", "cd", "tha long")) {
            return "cooldown";
        }
        if (containsAny(canonical, "rest", "recovery", "recover", "nghi")) {
            return "rest";
        }
        return "work";
    }

    private static DurationValue toDuration(double amount, String unit, String sport) {
        if (unit.startsWith("h")) {
            return new DurationValue("time", (int) Math.round(amount * 3600));
        }
        if (unit.startsWith("min")) {
            return new DurationValue("time", (int) Math.round(amount * 60));
        }
        if (unit.equals("m")) {
            int distanceThreshold = "swimming".equals(sport) ? 25 : 100;
            if (amount >= distanceThreshold) {
                return new DurationValue("distance", (int) Math.round(amount));
            }
            return new DurationValue("time", (int) Math.round(amount * 60));
        }
        if (unit.startsWith("s")) {
            return new DurationValue("time", (int) Math.round(amount));
        }
        if (unit.startsWith("km") || unit.startsWith("kilometer") || unit.startsWith("kilometre")) {
            return new DurationValue("distance", (int) Math.round(amount * 1000));
        }
        if (unit.startsWith("meter") || unit.startsWith("metre")) {
            return new DurationValue("distance", (int) Math.round(amount));
        }
        return null;
    }

    private static SplitRepeat splitRepeatRemainder(String remainder) {
        int slash = restSeparatorSlash(remainder);
        if (slash >= 0) {
            return new SplitRepeat(remainder.substring(0, slash).trim(), remainder.substring(slash + 1).trim());
        }

        int semicolon = remainder.indexOf(';');
        if (semicolon >= 0) {
            return new SplitRepeat(remainder.substring(0, semicolon).trim(), remainder.substring(semicolon + 1).trim());
        }

        Matcher then = Pattern.compile("\\s+then\\s+", Pattern.CASE_INSENSITIVE).matcher(remainder);
        if (then.find()) {
            return new SplitRepeat(remainder.substring(0, then.start()).trim(), remainder.substring(then.end()).trim());
        }

        Matcher plus = Pattern.compile("\\s+\\+\\s+").matcher(remainder);
        if (plus.find()) {
            return new SplitRepeat(remainder.substring(0, plus.start()).trim(), remainder.substring(plus.end()).trim());
        }

        int comma = remainder.indexOf(',');
        if (comma >= 0 && containsDuration(remainder.substring(comma + 1))) {
            return new SplitRepeat(remainder.substring(0, comma).trim(), remainder.substring(comma + 1).trim());
        }

        return new SplitRepeat(remainder.trim(), null);
    }

    private static int restSeparatorSlash(String remainder) {
        int slash = remainder.indexOf('/');
        while (slash >= 0) {
            String after = remainder.substring(slash + 1).trim().toLowerCase(Locale.ROOT);
            if (!after.startsWith("km") && !after.startsWith("100m") && containsDuration(after)) {
                return slash;
            }
            slash = remainder.indexOf('/', slash + 1);
        }
        return -1;
    }

    private static boolean hasInlineRest(String repeatRemainder) {
        return splitRepeatRemainder(repeatRemainder).restPart() != null;
    }

    private static String repeatRemainder(String text) {
        Matcher matcher = REPEAT_PREFIX.matcher(canonical(text));
        if (!matcher.matches()) {
            return text;
        }
        int x = text.toLowerCase(Locale.ROOT).indexOf('x');
        return x >= 0 ? text.substring(x + 1).trim() : matcher.group(2);
    }

    private static boolean containsDuration(String value) {
        return DURATION.matcher(canonical(value)).find();
    }

    private static List<ParsedLine> lines(String description) {
        if (description == null || description.isBlank()) {
            return List.of();
        }

        List<ParsedLine> lines = new ArrayList<>();
        for (String raw : description.split("\\R")) {
            if (raw.isBlank()) {
                continue;
            }
            boolean indented = !raw.isEmpty() && Character.isWhitespace(raw.charAt(0));
            String stripped = BULLET_PREFIX.matcher(raw.strip()).replaceFirst("").trim();
            if (!stripped.isBlank()) {
                lines.add(new ParsedLine(stripped, indented));
            }
        }
        return lines;
    }

    private static String canonical(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        return normalized
                .replace('×', 'x')
                .replace('–', '-')
                .replace('—', '-')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static double parseNumber(String value) {
        return Double.parseDouble(value.replace(',', '.'));
    }

    private static double paceSeconds(String value) {
        String[] parts = value.split(":");
        return Integer.parseInt(parts[0]) * 60.0 + Integer.parseInt(parts[1]);
    }

    private record ParsedLine(String text, boolean indented) {}
    private record SplitRepeat(String workPart, String restPart) {}
    private record DurationValue(String type, int value) {}
}
