# Activity Detail Page Spec

## Goal

Define a coach-grade and athlete-grade activity detail page for CoachFit that:

- never fabricates metrics
- clearly separates raw file data from derived metrics
- supports honest post-workout analysis for cycling, running, and swimming
- scales to long FIT/TCX/GPX files without locking the browser
- creates a realistic implementation path from the current repo

This spec is intentionally stricter than the current implementation. If the file or profile data does not support a metric, the page must hide that metric or mark it unavailable. It must not guess.

---

## Product Principles

### 1. Truth before completeness

- Raw file values win over UI convenience.
- Platform-processed values from Garmin/Strava may differ from raw FIT. The page must say which source each metric came from.

### 2. Separate metric classes

Every metric on the page must belong to exactly one class:

- `Raw`
  - stored directly from uploaded or synced activity data
  - examples: distance, elapsed time, lap splits, GPS, HR stream, power stream
- `Derived from raw`
  - deterministic calculation from stored activity data
  - examples: best 5-minute power, histogram, decoupling, time in stream-based buckets
- `Derived from athlete profile`
  - requires threshold or zone configuration
  - examples: time in power zones, time in HR zones, threshold-pace zones
- `Derived from plan`
  - requires a linked planned workout
  - examples: planned vs actual compliance, target interval hit rate

The UI must label or structure these classes clearly enough that a coach understands what is objective versus contextual.

### 3. Disable only the missing feature

- Missing pace threshold should remove pace-zone analysis, not kill all pace analytics.
- Missing HR stream should remove HR analytics, not hide route, laps, or source data.

### 4. Analysis must be sport-aware

- Cycling, running, and swimming need different default lenses.
- Generic layouts are allowed only for fallback sports.

### 5. Performance is a product requirement

- Detail page must remain responsive with `20k+` stream points.
- Charts may be visually downsampled, but selections and calculations must use the full stream.

---

## Primary Users

### Athlete

Typical questions:

- What actually happened in this workout?
- Where were the hard parts?
- Did I hit the intended intensity?
- Was this better or worse than usual?

### Coach

Typical questions:

- Did the athlete execute the session as prescribed?
- Which intervals or climbs mattered?
- Was the load right?
- Are the internal and external responses aligned?
- How does this compare with prior sessions?

---

## Benchmark Standard

The page should aim for the common minimum seen in mature analysis products:

- multi-channel chart with selection and zoom
- time in zones for available channels
- histogram and best-effort curves
- lap and interval review
- route plus elevation context
- planned vs actual review when a planned workout exists
- historical context and comparison workflow

CoachFit does **not** need to clone Intervals.icu or TrainingPeaks. It does need to meet the same decision quality bar for a single-activity review.

---

## Scope

### In Scope

- uploaded or synced activities
- single-activity detail page
- cycling, running, swimming first
- file-source truth and provenance
- coach review and athlete self-review

### Out of Scope

- full season analytics
- PMC / fitness-fatigue-form dashboards
- workout builder
- social feed

Those may link into this page, but they are not defined here.

---

## Information Architecture

The detail page should contain these sections.

### A. Activity Header

Purpose: instant orientation and trust.

Must include:

- sport and sub-sport
- title
- start date/time with athlete locale
- source badge
- raw file format if present
- key summary metrics
- quality/provenance status

Header summary metric rules:

- Always show:
  - distance
  - elapsed time
  - sport-appropriate speed or pace
- Show when available:
  - moving time
  - elevation gain
  - calories
  - avg/max HR
  - avg/max power
  - normalized power
  - intensity factor
  - TSS
  - cadence

### B. Timeline Tab

Purpose: inspect the full session visually.

Must include:

- multi-lane time-series chart
- lane toggles
- selection by drag
- zoom and reset
- hover values
- selected-range summary

Must support channels when present:

- power
- HR
- cadence
- speed
- pace
- altitude
- distance
- grade
- temperature

Should support:

- time or distance x-axis toggle
- lap markers
- pause markers
- interval markers
- climb markers

### C. Sport Analytics Tab

This is the current `POWER` tab for cycling and `PACE` tab for run/swim.

Must include:

- raw anchor metrics for the relevant channel
- time-in-zone only when threshold profile exists
- histogram
- peak rolling curve
- best efforts table

Should include:

- interval-aware analysis
- historical context against recent and season bests
- notable effort callouts

### D. HR Analytics Tab

Must include:

- avg/max HR anchors
- time in HR zones when LTHR or HR zone profile exists
- HR distribution
- peak HR curve
- time above threshold

Should include:

- aerobic decoupling
- HR drift markers
- HR recovery markers after intervals or climbs

### E. Route Tab

Must include:

- map with GPS path when available
- start/end markers

Should include:

- elevation profile linkage
- climb overlays
- route plus selected interval sync

### F. Data Tab

Must include:

- laps table
- metrics table
- source information

Should include:

- interval table
- raw versus derived provenance
- file integrity warnings

### G. Coach Notes / Athlete Feedback Rail

Must include:

- subjective feedback block
- notes/comments area

Should include:

- coach-only annotations
- comments tied to selected range or interval

---

## Must-Have Requirements

These are the minimum requirements for an internationally credible activity detail page.

### Must-Have 1: Honest Data Provenance

For every visible metric:

- source must be either raw, derived from raw, athlete-profile-derived, or plan-derived
- empty state must explain what is missing
- no default FTP/LTHR/threshold pace/CSS may be silently assumed

### Must-Have 2: File-Truth Summary

The detail page must be able to answer:

- what does the raw file say?
- what did CoachFit calculate from that file?
- which values required athlete profile data?

### Must-Have 3: Smooth Large-File Rendering

Performance targets:

- page remains interactive on `15k-20k` points
- chart render may downsample for drawing
- selected-range calculations must still use the full stream

### Must-Have 4: Channel-Scoped Analytics

For each available stream, show:

- distribution
- peak rolling curve
- best efforts

For each missing stream, show a precise empty state.

### Must-Have 5: Zone-Scoped Analytics Only With Real Zones

Zone analytics may render only if the matching profile exists:

- cycling power -> `sport=cycling`, `zoneType=power`
- run/swim pace -> `sport in {running, swimming}`, `zoneType=pace`
- HR -> `zoneType=heart_rate`

### Must-Have 6: Laps and Selected-Range Analysis

The page must support:

- device laps or parsed laps
- ad hoc selection on chart
- min/avg/max summaries for that selection

### Must-Have 7: Source Download and Auditability

If a raw file exists, the user must be able to:

- download it
- see the format
- know that re-parsing can happen later

---

## Should-Have Requirements

These significantly improve coach usefulness and bring the page closer to Intervals.icu / TrainingPeaks.

### Should-Have 1: Planned vs Actual

When linked to a calendar workout:

- compare planned duration, distance, load, and interval targets
- show completion or compliance status
- highlight misses by interval

### Should-Have 2: Automatic Interval Detection

For supported sports:

- detect meaningful work intervals from power or pace
- detect climbs from GPS and grade
- let the user inspect these detected intervals in table form

### Should-Have 3: Historical Context

The page should surface:

- best effort relative to last 42 days
- season best
- all-time best
- prior similar session comparison

### Should-Have 4: Compare Workflow

Allow the user to:

- compare this activity with another activity
- compare selected laps or intervals
- compare progression across repeated sessions

### Should-Have 5: Quality Flags

Examples:

- missing GPS
- low-quality elevation
- unusual pause behavior
- power spikes corrected
- moving time ambiguity

### Should-Have 6: Custom Interval Save

Users should be able to:

- select a range
- save it as a custom interval
- name it
- comment on it

---

## Sport-Specific Requirements

### Cycling

Must-have:

- power summary
- NP
- IF
- TSS
- time in power zones when FTP exists
- cadence
- HR overlay
- elevation gain

Should-have:

- interval NP / IF / TSS
- W/kg
- power-to-HR decoupling
- climb segmentation
- dual-power-source handling

### Running

Must-have:

- pace summary
- moving time
- cadence
- HR
- time in pace zones when threshold pace exists
- elevation gain

Should-have:

- pace-to-HR decoupling
- grade-adjusted context only if model/source is explicit
- best distance efforts
- running dynamics if present in FIT

### Swimming

Must-have:

- swim pace summary
- stroke rate if present
- HR if present
- time in pace/CSS zones when profile exists

Should-have:

- SWOLF only if truly present or safely computable from known pool metrics
- stroke count
- pool length
- interval-by-length analysis

### Strength / Other

Must-have:

- honest fallback summary
- elapsed time
- HR if present
- calories if present

Should-have:

- modality-specific extension later

---

## Data Contract Requirements

### Current Backend Inputs

Today the activity module already exposes:

- `GET /activities/{id}`
- `GET /activities/{id}/streams`
- `GET /activities/{id}/laps`
- `GET /activities/{id}/download`
- `GET /athlete/zones`

Current DTOs already carry enough for a stronger v1:

- detail summary fields
- stream arrays including `grade` and `temperature`
- lap summary fields

### Required Contract Rules

#### Detail summary

Must continue to support:

- elapsed time
- moving time
- distance
- elevation gain
- calories
- avg/max HR
- avg/max power
- NP
- IF
- TSS
- cadence
- avg speed

Should add:

- data quality flags
- activity parsing version
- source summary provenance
- pause count / total stopped time if derivable

#### Streams

Must support:

- timestamps
- HR
- power
- cadence
- speed
- altitude
- lat/lng
- distance
- grade
- temperature

Should add later:

- left-right balance
- vertical oscillation
- ground contact time
- stroke count
- swolf

#### Laps

Must support:

- lap start
- duration
- distance
- avg/max HR
- avg/max power
- avg cadence
- avg speed or pace
- elevation gain

Should add:

- lap NP
- lap IF
- lap TSS
- lap quality flags
- lap source type: device, user, detected_interval, detected_climb

---

## UX Rules

### Metric display rules

- Do not show units ambiguously.
- Pace must be sport-appropriate:
  - running -> `/km`
  - swimming -> `/100m`
- Distance must be sport-appropriate:
  - swimming may prefer metres for short pool sessions

### Empty states

Every empty state must state:

- what data is missing
- what still works
- what the user can do if the issue is profile-related

Bad:

- "Not available"

Good:

- "No heart-rate stream was recorded in this file, so HR analysis cannot be calculated. Route, laps, and raw activity summary are still available."

### Provenance wording

The UI should explicitly say:

- "Parsed from raw FIT/TCX/GPX"
- "Calculated from parsed telemetry"
- "Based on athlete threshold profile"
- "Compared to planned workout"

### Selection behavior

- chart selection must be preserved when changing tabs
- route and laps should react to the selected interval in later versions

---

## Performance Rules

### Must-have

- downsample only for visual chart rendering
- use full stream for selected-range calculations
- lazy-load heavy map code
- avoid mounting expensive tabs until opened

### Target budgets

- initial tab interactive under 2 seconds on a typical local dev machine for `15k` points
- tab switch under 300 ms for already-fetched data
- no browser lockups from chart rendering

---

## Acceptance Criteria

The page is acceptable when all statements below are true.

### Data honesty

- No metric is displayed from an implicit default threshold.
- A coach can tell which metrics came from the file versus from athlete profile.

### Analysis utility

- An athlete can review the hardest parts of the workout without opening developer tools.
- A coach can inspect a selected interval and lap splits and make a basic execution judgment.

### Reliability

- Two uploads of the same raw file result in the same visible summary.
- If Garmin Connect summary differs from raw FIT, the page explains that CoachFit is using raw file truth.

### Performance

- Opening a long activity does not freeze the browser.

---

## Current Repo Gap Analysis

### Already Good

- raw file parsing for FIT/TCX/GPX is materially improved
- detail page now avoids synthetic FTP/LTHR/pace values
- analytics tabs now render raw channel analysis even without zone profile
- chart rendering is visually downsampled for better browser performance
- source download exists

### Partial

- timeline chart exists, but only time-based and not distance-based
- laps exist, but no interval table
- zone support exists, but frontend/backend contract around pace zones is still inconsistent in some settings flows
- coach notes exist, but not tied to intervals or selections

### Missing

- planned vs actual compliance
- auto interval detection
- climb detection
- lap comparison
- activity comparison
- historical context for best efforts
- data quality flags
- explicit provenance badges per metric block
- sport-specific advanced metrics

---

## Backlog for This Repo

This backlog is ordered by implementation value, not by ideal architecture purity.

### Epic A: Data Truth and Provenance

Priority: `P0`

Goal:

- make every visible metric auditable

Backend:

- update [ActivityDetailResponse.java](/C:/Working/coachfit/backend/src/main/java/com/coachfit/activity/adapter/in/dto/ActivityDetailResponse.java)
  - add provenance or analysis metadata block
- update [ActivityStreamsResponse.java](/C:/Working/coachfit/backend/src/main/java/com/coachfit/activity/adapter/in/dto/ActivityStreamsResponse.java)
  - document and expose all supported channels clearly
- extend [ActivityQueryCommandService.java](/C:/Working/coachfit/backend/src/main/java/com/coachfit/activity/application/service/ActivityQueryCommandService.java)
  - attach quality flags and parser version

Frontend:

- extend [activity.ts](/C:/Working/coachfit/frontend/src/lib/types/activity.ts)
  - include temperature and future provenance fields
- update [ActivitySourceInfo.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/ActivitySourceInfo.tsx)
  - show raw-versus-derived explanation
- update [ActivityMetrics.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/ActivityMetrics.tsx)
  - group metrics by data class

Definition of done:

- any disputed metric can be traced to its source class on-screen

### Epic B: CoachFit Activity Detail V1

Priority: `P0`

Goal:

- complete the single-activity review page

Frontend:

- refine [page.tsx](/C:/Working/coachfit/frontend/src/app/(app)/activities/[id]/page.tsx)
  - cleaner information architecture
  - explicit raw/profile/planned sections
- refine [ActivityAnalyticsTab.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/ActivityAnalyticsTab.tsx)
  - add distance-axis option
  - add temperature and grade support where relevant
- refine [InteractiveMultiLaneChart.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/InteractiveMultiLaneChart.tsx)
  - lap markers
  - selected-range persistence improvements
- refine [ActivityLaps.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/ActivityLaps.tsx)
  - stronger table review and selected-lap focus

Definition of done:

- coach and athlete can review summary, timeline, zone/context charts, route, and laps without misleading states

### Epic C: Planned vs Actual Compliance

Priority: `P1`

Goal:

- answer whether the athlete did the prescribed workout

Backend:

- add relation between completed activity and planned workout
- add analysis service to compare targets vs actual
- likely new endpoint:
  - `GET /activities/{id}/compliance`

Candidate files:

- [ActivityController.java](/C:/Working/coachfit/backend/src/main/java/com/coachfit/activity/adapter/in/ActivityController.java)
- [ActivityQueryCommandService.java](/C:/Working/coachfit/backend/src/main/java/com/coachfit/activity/application/service/ActivityQueryCommandService.java)
- workout and calendar modules for linking planned sessions

Frontend:

- add compliance card on detail page
- highlight hit/miss by overall session and by interval

Definition of done:

- coach can answer "did the athlete do the workout as planned?"

### Epic D: Interval Detection and Interval Table

Priority: `P1`

Goal:

- move from lap review to training-block review

Backend:

- add interval detection service for power and pace
- add interval DTO and endpoint:
  - `GET /activities/{id}/intervals`

Candidate files:

- new analysis service under `activity/application/service`
- new DTO under `activity/adapter/in/dto`
- extend persistence only if custom intervals need storage

Frontend:

- new interval table component under
  - `frontend/src/components/activities/detail/`
- selected chart range can be saved as a custom interval

Definition of done:

- every important effort in a workout can be reviewed in structured rows

### Epic E: Climb Detection and Elevation Review

Priority: `P2`

Goal:

- make outdoor route review useful for coaches

Backend:

- detect climbs from grade, elevation, and distance
- return climb segments as a specialized interval type

Frontend:

- overlay climbs on route and timeline
- climb table with distance, gain, avg grade, effort metrics

Definition of done:

- coach can isolate meaningful climbs without manual scrubbing

### Epic F: Historical Context and Comparison

Priority: `P2`

Goal:

- judge the workout against prior performance

Backend:

- add best-effort comparison queries for:
  - last 42 days
  - season
  - all-time
- later add activity comparison API

Frontend:

- enrich [ActivityAnalyticsTab.tsx](/C:/Working/coachfit/frontend/src/components/activities/detail/ActivityAnalyticsTab.tsx)
  - compare current peaks to history
- add compare-entry actions from the detail page

Definition of done:

- a coach can tell if a peak effort is normal, improving, or a breakthrough

### Epic G: Sport-Specific Advanced Metrics

Priority: `P3`

Goal:

- reach deeper parity for serious users

Cycling:

- left/right balance
- torque metrics
- dual-source power selection

Running:

- ground contact time
- vertical oscillation
- step length
- explicit GAP only if source/model is defensible

Swimming:

- true SWOLF
- stroke count
- pool length
- per-length interval review

Definition of done:

- advanced users stop feeling the page is generic

---

## Recommended Delivery Phases

### Phase 1

- Epic A
- Epic B

Outcome:

- honest and stable activity detail page

### Phase 2

- Epic C
- Epic D

Outcome:

- coach-useful execution review

### Phase 3

- Epic E
- Epic F

Outcome:

- strong outdoor and historical analysis

### Phase 4

- Epic G

Outcome:

- sport-specific depth

---

## Immediate Next Implementation Tasks

If continuing from the current codebase, the next practical tasks should be:

1. Normalize athlete zone contract across backend and frontend.
   - current risk: pace zone handling still differs between detail/settings/workout flows
2. Add provenance metadata to activity detail responses and render it in the UI.
3. Add distance-axis support and lap markers to the timeline chart.
4. Implement an interval table API and UI.
5. Add planned-vs-actual compliance once activity-to-workout linking is available.

---

## Non-Negotiable Rules

- No fake thresholds.
- No fake SWOLF.
- No fake GAP.
- No silent fallback FTP/LTHR/CSS.
- No whole-tab disable when only one feature is missing.
- No performance regressions from rendering full raw streams directly.

