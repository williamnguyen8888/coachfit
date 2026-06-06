"use client";

/**
 * WorkoutScriptEditor — text-based workout editor with TrainingPeaks/Intervals.icu-compatible syntax.
 *
 * Syntax reference:
 *   # comment
 *   Warmup: 15min @z2
 *   Work: 4min @z5
 *   Rest: 2min @z1
 *   3x:
 *     Work: 4min @z5
 *     Rest: 2min @z1
 *   Cooldown: 10min @z2
 *
 * Supported:
 *   - Step types: Warmup/WU, Work/Main, Rest, Cooldown/CD, Ramp, Free
 *   - Durations: 15min | 1:30 (1m30s) | 5km | 10km | lap
 *   - Targets: @z1–@z7 | @75-85% | @280-310w | @130-145bpm | @rpe7 | @open
 *   - Repeats: Nx: followed by indented steps
 *   - Notes: [Keep cadence 90+]
 */

import * as React from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import type { BuilderStep, BuilderLeafStep, BuilderRepeatStep } from "@/lib/types/builder";
import { makeLeafStep, makeRepeatStep } from "@/lib/types/builder";
import type { StepDuration, StepTarget } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Types                                                                */
/* ------------------------------------------------------------------ */

export interface ParseResult {
  steps: BuilderStep[];
  errors: string[];
  warnings: string[];
}

export interface WorkoutScriptEditorProps {
  initialScript?: string;
  onParsed: (result: ParseResult) => void;
  sport: Sport;
  onError: (errors: string[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Parser helpers                                                       */
/* ------------------------------------------------------------------ */

type LeafType = BuilderLeafStep["type"];

const STEP_TYPE_MAP: Record<string, LeafType> = {
  warmup: "warmup",
  wu: "warmup",
  work: "work",
  main: "work",
  rest: "rest",
  recovery: "rest",
  cooldown: "cooldown",
  cd: "cooldown",
  ramp: "ramp",
  free: "free",
};

/** Parse duration token: 15min | 1:30 | 5km | 10km | lap */
function parseDuration(token: string): StepDuration | null {
  const t = token.trim().toLowerCase();

  if (t === "lap") return { type: "lap_button" };

  // km distance: e.g. "5km", "10km", "0.5km"
  const kmMatch = t.match(/^([\d.]+)km$/);
  if (kmMatch) {
    const km = parseFloat(kmMatch[1]);
    return { type: "distance", value: Math.round(km * 1000) };
  }

  // meters: e.g. "400m"
  const mMatch = t.match(/^(\d+)m$/);
  if (mMatch) {
    return { type: "distance", value: parseInt(mMatch[1], 10) };
  }

  // minutes: e.g. "15min", "5min"
  const minMatch = t.match(/^([\d.]+)min$/);
  if (minMatch) {
    return { type: "time", value: Math.round(parseFloat(minMatch[1]) * 60) };
  }

  // seconds: e.g. "30s", "45s"
  const secMatch = t.match(/^(\d+)s$/);
  if (secMatch) {
    return { type: "time", value: parseInt(secMatch[1], 10) };
  }

  // mm:ss format: e.g. "1:30", "10:00"
  const mmssMatch = t.match(/^(\d+):(\d{2})$/);
  if (mmssMatch) {
    return { type: "time", value: parseInt(mmssMatch[1], 10) * 60 + parseInt(mmssMatch[2], 10) };
  }

  return null;
}

/** Parse target token: @z2 | @75-85% | @280-310w | @130-145bpm | @rpe7 | @open */
function parseTarget(token: string): StepTarget | null {
  const t = token.replace(/^@/, "").trim().toLowerCase();

  if (t === "open") return { type: "open" };

  // Zone: z1–z7
  const zoneMatch = t.match(/^z(\d)$/);
  if (zoneMatch) {
    return { type: "power_zone", zone: parseInt(zoneMatch[1], 10) };
  }

  // Power pct: 75-85% or 80%
  const pctRangeMatch = t.match(/^(\d+)-(\d+)%$/);
  if (pctRangeMatch) {
    return { type: "power_pct", min: parseInt(pctRangeMatch[1], 10) / 100, max: parseInt(pctRangeMatch[2], 10) / 100 };
  }
  const pctSingleMatch = t.match(/^(\d+)%$/);
  if (pctSingleMatch) {
    const v = parseInt(pctSingleMatch[1], 10) / 100;
    return { type: "power_pct", min: v, max: v };
  }

  // Watts: 280-310w or 300w
  const wattRangeMatch = t.match(/^(\d+)-(\d+)w$/);
  if (wattRangeMatch) {
    return { type: "power_watts", min: parseInt(wattRangeMatch[1], 10), max: parseInt(wattRangeMatch[2], 10) };
  }
  const wattSingleMatch = t.match(/^(\d+)w$/);
  if (wattSingleMatch) {
    const v = parseInt(wattSingleMatch[1], 10);
    return { type: "power_watts", min: v, max: v };
  }

  // HR bpm: 130-145bpm or 140bpm
  const bpmRangeMatch = t.match(/^(\d+)-(\d+)bpm$/);
  if (bpmRangeMatch) {
    return { type: "hr_bpm", min: parseInt(bpmRangeMatch[1], 10), max: parseInt(bpmRangeMatch[2], 10) };
  }
  const bpmSingleMatch = t.match(/^(\d+)bpm$/);
  if (bpmSingleMatch) {
    const v = parseInt(bpmSingleMatch[1], 10);
    return { type: "hr_bpm", min: v, max: v };
  }

  // RPE: rpe7
  const rpeMatch = t.match(/^rpe(\d+(?:\.\d+)?)$/);
  if (rpeMatch) {
    const v = parseFloat(rpeMatch[1]);
    return { type: "rpe", min: v, max: v };
  }

  return null;
}

/** Parse a single leaf step line: "Work: 4min @z5 [Keep cadence 90+]" */
function parseLeafLine(
  line: string,
  lineNum: number,
  errors: string[],
  warnings: string[]
): BuilderLeafStep | null {
  // Extract optional [note]
  let notes: string | undefined;
  const noteMatch = line.match(/\[([^\]]*)\]/);
  if (noteMatch) {
    notes = noteMatch[1].trim();
    line = line.replace(noteMatch[0], "").trim();
  }

  // "StepType: duration @target"
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) {
    errors.push(`Line ${lineNum}: Expected "StepType: duration [@target]"`);
    return null;
  }

  const typeRaw = line.slice(0, colonIdx).trim().toLowerCase();
  const leafType = STEP_TYPE_MAP[typeRaw];
  if (!leafType) {
    errors.push(`Line ${lineNum}: Unknown step type "${line.slice(0, colonIdx).trim()}"`);
    return null;
  }

  const rest = line.slice(colonIdx + 1).trim();
  const tokens = rest.split(/\s+/);

  const durationToken = tokens.find((t) => !t.startsWith("@"));
  const targetToken = tokens.find((t) => t.startsWith("@"));

  if (!durationToken) {
    errors.push(`Line ${lineNum}: Missing duration`);
    return null;
  }

  const duration = parseDuration(durationToken);
  if (!duration) {
    errors.push(`Line ${lineNum}: Cannot parse duration "${durationToken}"`);
    return null;
  }

  let target: StepTarget = { type: "open" };
  if (targetToken) {
    const parsed = parseTarget(targetToken);
    if (!parsed) {
      warnings.push(`Line ${lineNum}: Unrecognised target "${targetToken}" — using open`);
    } else {
      target = parsed;
    }
  }

  return makeLeafStep(leafType, { duration, target, notes });
}

/** Core parser */
export function parseWorkoutScript(text: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: BuilderStep[] = [];

  const rawLines = text.split("\n");
  let i = 0;

  while (i < rawLines.length) {
    const raw = rawLines[i];
    const trimmed = raw.trim();
    i++;

    // skip blanks & comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Repeat block: e.g. "3x:" or "3X:"
    const repeatMatch = trimmed.match(/^(\d+)[xX]\s*:\s*$/);
    if (repeatMatch) {
      const count = parseInt(repeatMatch[1], 10);
      if (count < 1 || count > 99) {
        errors.push(`Line ${i}: Repeat count must be 1–99 (got ${count})`);
        continue;
      }

      const childSteps: BuilderLeafStep[] = [];

      // Consume indented child lines
      while (i < rawLines.length) {
        const childRaw = rawLines[i];
        const childTrimmed = childRaw.trim();

        if (!childTrimmed || childTrimmed.startsWith("#")) {
          i++;
          continue;
        }

        // Stop if line is not indented (back to top-level)
        const isIndented = childRaw.match(/^[\t ]/) !== null;
        if (!isIndented) break;

        i++;
        const child = parseLeafLine(childTrimmed, i, errors, warnings);
        if (child) childSteps.push(child);
      }

      if (childSteps.length === 0) {
        errors.push(`Line ${i}: Repeat block is empty`);
        continue;
      }

      const repeatStep: BuilderRepeatStep = {
        uid: crypto.randomUUID(),
        type: "repeat",
        count,
        steps: childSteps,
      };
      steps.push(repeatStep);
      continue;
    }

    // Top-level leaf step
    const leaf = parseLeafLine(trimmed, i, errors, warnings);
    if (leaf) steps.push(leaf);
  }

  return { steps, errors, warnings };
}

/* ------------------------------------------------------------------ */
/*  Steps → Script converter                                             */
/* ------------------------------------------------------------------ */

function formatDurationForScript(d: StepDuration): string {
  if (d.type === "lap_button") return "lap";
  if (d.type === "distance") {
    const v = d.value ?? 0;
    return v >= 1000 ? `${v / 1000}km` : `${v}m`;
  }
  // time
  const secs = d.value ?? 300;
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  if (s === 0) return `${mins}min`;
  return `${mins}:${String(s).padStart(2, "0")}`;
}

function formatTargetForScript(t: StepTarget): string {
  if (t.type === "open" || t.type === "none") return "@open";
  if (t.type === "power_zone" && t.zone) return `@z${t.zone}`;
  if (t.type === "power_pct") {
    const lo = Math.round((t.min ?? 0.75) * 100);
    const hi = Math.round((t.max ?? 0.85) * 100);
    return lo === hi ? `@${lo}%` : `@${lo}-${hi}%`;
  }
  if (t.type === "power_watts") {
    const lo = t.min ?? 0;
    const hi = t.max ?? 0;
    return lo === hi ? `@${lo}w` : `@${lo}-${hi}w`;
  }
  if (t.type === "hr_bpm") {
    const lo = t.min ?? 0;
    const hi = t.max ?? 0;
    return lo === hi ? `@${lo}bpm` : `@${lo}-${hi}bpm`;
  }
  if (t.type === "hr_zone" && t.zone) return `@hz${t.zone}`;
  if (t.type === "rpe") {
    const v = t.min ?? t.value ?? 5;
    return `@rpe${v}`;
  }
  return "@open";
}

function leafStepTypeName(type: BuilderLeafStep["type"]): string {
  switch (type) {
    case "warmup":   return "Warmup";
    case "work":     return "Work";
    case "rest":     return "Rest";
    case "cooldown": return "Cooldown";
    case "ramp":     return "Ramp";
    case "free":     return "Free";
    default:         return "Work";
  }
}

function leafToLine(step: BuilderLeafStep, indent = ""): string {
  const typeStr = leafStepTypeName(step.type);
  const durStr = formatDurationForScript(step.duration);
  const tgtStr = formatTargetForScript(step.target);
  const noteStr = step.notes ? ` [${step.notes}]` : "";
  return `${indent}${typeStr}: ${durStr} ${tgtStr}${noteStr}`;
}

export function stepsToScript(steps: BuilderStep[]): string {
  const lines: string[] = [];
  for (const step of steps) {
    if (step.type === "repeat") {
      lines.push(`${step.count}x:`);
      for (const child of step.steps) {
        lines.push(leafToLine(child, "  "));
      }
      lines.push("");
    } else {
      lines.push(leafToLine(step));
    }
  }
  return lines.join("\n").trim();
}

/* ------------------------------------------------------------------ */
/*  Preview summary                                                       */
/* ------------------------------------------------------------------ */

function buildSummary(result: ParseResult): string {
  if (result.steps.length === 0) return "Empty — start typing above";

  let totalSecs = 0;
  let repeatCount = 0;
  let blockCount = 0;

  for (const step of result.steps) {
    blockCount++;
    if (step.type === "repeat") {
      repeatCount++;
      for (const child of step.steps) {
        if (child.duration.type === "time") totalSecs += (child.duration.value ?? 0) * step.count;
      }
    } else if (step.duration.type === "time") {
      totalSecs += step.duration.value ?? 0;
    }
  }

  const totalMin = Math.round(totalSecs / 60);
  const parts: string[] = [`${blockCount} block${blockCount !== 1 ? "s" : ""}`];
  if (totalMin > 0) parts.push(`~${totalMin}min`);
  if (repeatCount > 0) parts.push(`${repeatCount}x interval set${repeatCount !== 1 ? "s" : ""}`);

  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/*  Syntax reference                                                      */
/* ------------------------------------------------------------------ */

const SYNTAX_REFERENCE = `# Step types
Warmup: 15min @z2
Work: 4min @z5
Rest: 2min @z1 [Active recovery]
Cooldown: 10min @open

# Repeat block
3x:
  Work: 4min @z5
  Rest: 2min @z1

# Target formats
@z1  @z2 … @z7      power zone
@75-85%             FTP percentage range
@280-310w           absolute watts range
@130-145bpm         heart rate bpm
@rpe7               rate of perceived effort
@open               no target

# Duration formats
15min  1:30  5km  400m  lap`;

/* ------------------------------------------------------------------ */
/*  Main Component                                                        */
/* ------------------------------------------------------------------ */

const DEBOUNCE_MS = 300;

export function WorkoutScriptEditor({
  initialScript = "",
  onParsed,
  onError,
}: WorkoutScriptEditorProps) {
  const [script, setScript] = React.useState(initialScript);
  const [parseResult, setParseResult] = React.useState<ParseResult>(() =>
    parseWorkoutScript(initialScript)
  );
  const [showSyntaxRef, setShowSyntaxRef] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Update script when initialScript changes from parent (e.g., switching modes)
  React.useEffect(() => {
    setScript(initialScript);
    const result = parseWorkoutScript(initialScript);
    setParseResult(result);
  }, [initialScript]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setScript(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = parseWorkoutScript(value);
      setParseResult(result);
      if (result.errors.length === 0) {
        onParsed(result);
      } else {
        onError(result.errors);
      }
    }, DEBOUNCE_MS);
  }

  // Notify parent immediately of initial parse
  React.useEffect(() => {
    if (parseResult.errors.length === 0 && parseResult.steps.length > 0) {
      onParsed(parseResult);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasErrors = parseResult.errors.length > 0;
  const hasWarnings = parseResult.warnings.length > 0;
  const summary = buildSummary(parseResult);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Editor area ── */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-elevated)",
          border: `1px solid ${hasErrors ? "var(--color-danger)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
          overflow: "hidden",
          transition: "border-color 150ms",
        }}
      >
        <textarea
          ref={textareaRef}
          value={script}
          onChange={handleChange}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={`# Start typing your workout script\nWarmup: 15min @z2\n3x:\n  Work: 4min @z5\n  Rest: 2min @z1\nCooldown: 10min @z2`}
          style={{
            display: "block",
            width: "100%",
            minHeight: 240,
            maxHeight: 480,
            padding: "16px 16px 16px 16px",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "vertical",
            fontFamily: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.75,
            color: "var(--text-primary)",
            tabSize: 2,
          }}
        />
      </div>

      {/* ── Status bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 12px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderTop: "none",
          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: hasErrors ? "var(--color-danger)" : "var(--text-muted)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {hasErrors ? `${parseResult.errors.length} error${parseResult.errors.length !== 1 ? "s" : ""}` : summary}
        </span>

        <button
          type="button"
          onClick={() => setShowSyntaxRef((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          Syntax
          {showSyntaxRef ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* ── Error list ── */}
      {(hasErrors || hasWarnings) && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {parseResult.errors.map((err, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 10px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderLeft: "3px solid var(--color-danger)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <AlertCircle size={12} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", fontFamily: "var(--font-mono, monospace)" }}>
                {err}
              </span>
            </div>
          ))}
          {parseResult.warnings.map((warn, idx) => (
            <div
              key={`w${idx}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 10px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderLeft: "3px solid var(--color-accent)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                {warn}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Syntax reference (collapsible) ── */}
      {showSyntaxRef && (
        <div
          style={{
            marginTop: 8,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Syntax Reference
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "12px 16px",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: "var(--text-xs)",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {SYNTAX_REFERENCE}
          </pre>
        </div>
      )}
    </div>
  );
}
