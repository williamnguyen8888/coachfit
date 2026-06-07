# Workout & Performance Calculation Engine Audit

Audit date: 2026-06-07

## Executive Conclusion

The current implementation is **not compliant** with the rule that Threshold Settings are the single source of truth for workout metrics, zones, training load, analytics, and reports.

The largest causes of mismatch with TrainingPeaks and Intervals.icu are:

1. Activity TSS/IF/NP are often imported or left null instead of recalculated from the user's threshold settings.
2. Planned workout TSS and intensity use hard-coded FTP/LTHR/pace/zone IF heuristics.
3. The `training_load` table exists, but no Java writer/recalculation engine was found for `daily_tss`, `ctl`, `atl`, or `tsb`.
4. Several analytics/calendar paths either cannot query `sport_zones` correctly or select the wrong row.
5. Frontend activity tabs fabricate zones/curves when streams are missing and re-bin zones with hard-coded percentages.

Reference baseline:

- TrainingPeaks defines IF as normalized power/pace divided by functional threshold power/pace, and requires a workout-specific power threshold for IF calculation: https://help.trainingpeaks.com/hc/en-us/articles/204071814-Intensity-Factor-IF
- TrainingPeaks TSS formula: `TSS = (sec * NP * IF) / (FTP * 3600) * 100`: https://www.trainingpeaks.com/learn/articles/estimating-training-stress-score-tss/
- TrainingPeaks NP is used with threshold to calculate IF/TSS and starts with a 30-second rolling average: https://help.trainingpeaks.com/hc/en-us/articles/204071804-Normalized-Power
- TrainingPeaks CTL/ATL are exponentially weighted daily TSS averages with default 42-day and 7-day constants; TSB uses yesterday's CTL minus yesterday's ATL: https://help.trainingpeaks.com/hc/en-us/articles/204071884-Fitness-CTL, https://help.trainingpeaks.com/hc/en-us/articles/204071894-Fatigue-ATL, https://help.trainingpeaks.com/hc/en-us/articles/204071764-Form-TSB
- Intervals.icu states it supports separate sport zones/settings, load from power/HR/pace, and standard Coggan power load; forum guidance also states cycling load is based on FTP active on the activity date, not eFTP: https://www.intervals.icu/ and https://forum.intervals.icu/t/ftp-used-automatically-for-load-calculation/125055

## Formula Audit Matrix

Severity levels:

- Critical: can directly produce materially wrong metrics, broken analytics, or reference-platform mismatch.
- High: wrong in common cases or silently hides invalid data.
- Medium: display/report inconsistency or non-threshold business heuristic.
- Low: mostly label/configuration risk.

| ID | Severity | Formula / area | Source | Current formula / input | Expected threshold source | Hard-code / fallback / magic number | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Critical | Training load, CTL, ATL, TSB | `V011__create_training_load.sql`; no Java `INSERT/UPDATE training_load` found | Table stores `daily_tss`, `ctl`, `atl`, `tsb`; app only reads it. | Daily activity TSS recalculated from user thresholds by activity date; CTL/ATL EMA from daily TSS. | No calculator/writer found; `is_dirty` migration documents recalculation but no implementation. | PMC/dashboard/coach cannot match TrainingPeaks/Intervals unless another process fills this table. | Implement `TrainingLoadRecalculationService`: daily TSS by sport and all, CTL `prev + (TSS - prev)/42`, ATL `prev + (TSS - prev)/7`, TSB using selected platform convention, mark dirty on activity/threshold change. |
| A02 | Critical | Threshold Settings schema and zone parsing | `SportZone.ZoneBand`, `UpsertSportZoneRequest`, seed data | Domain/request use primitive `int min/max`; seed JSON uses `null` for open-ended bands. | Nullable `min/max` from `sport_zones.zones`. | Open-ended zones cannot be represented by API/domain; JSON null may deserialize to 0 or fail depending path. | Z1/Z7 bounds can be wrong or un-saveable; time-in-zone can misclassify boundary samples. | Change bands to `Integer min/max`, allow null in request, validate only when both sides exist. |
| A03 | Critical | HR zone type consistency | `AthleteService.SUPPORTED_ZONE_TYPES`, seed data, analytics queries | Code expects `heart_rate`; seed inserts `hr`. | Canonical zone type per Threshold Settings. | `hr` vs `heart_rate` mismatch. | HR zones disappear from export, analytics, calendar, and coach views. | Migrate `hr` to `heart_rate`; add DB check/enum; support legacy alias only during migration. |
| A04 | Critical | Analytics zone boundaries | `AnalyticsQueryAdapter.findZoneBoundaries` | SQL filters `status = 'active'`; `sport_zones` has no `status`. | Latest/effective sport zone rows. | Non-existent column. | `/training-load/zones` fails at runtime. | Remove status filter or add column with migration; query `effective_date <= activity/date range`. |
| A05 | Critical | Activity TSS/IF/NP import | `FitParser`, `TcxParser`, `GpxParser`, `ActivityPersistenceAdapter` | FIT keeps provider `normalizedPower`, `intensityFactor`, `tss`; TCX/GPX set them null; persistence saves parsed values. | Recompute from streams and user threshold snapshot. | Silent trust of provider metrics or null. | Same workout + same thresholds will not match reference if imported values were produced with different thresholds or absent. | Add activity calculation pipeline after import: compute NP/IF/TSS/hrTSS/pace load from local streams and threshold snapshot; persist provenance. |
| A06 | Critical | Strava sync power TSS | `StravaActivitySyncService.syncActivity` | Computes NP, then leaves IF/TSS null due TODO. | User cycling FTP active at activity date. | No FTP load; null TSS/IF. | Power activities synced from Strava do not contribute reliable TSS/load. | Load `sport_zones` power threshold by sport and `started_at`; compute IF/TSS; mark training load dirty. |
| A07 | Critical | Strava HR TSS fallback | `StravaActivitySyncService`, `StravaMetricsCalculator.calculateHrTss` | HR TSS uses resting HR 60, max HR 190, male=true; TRIMP scale `100/1.5`. | User resting HR, max HR, LTHR and configured load method. | 60, 190, male, TRIMP coefficients, 1.5 scale. | HR-only load can be severely wrong; not comparable across users/platforms. | Do not calculate HR load unless user HR thresholds/profile exist; store method/version; make coefficients business-configured. |
| A08 | Critical | Garmin activity sync | `GarminActivitySyncService` | Stores summary fields, leaves NP/IF/TSS null and emits event TSS null. | User threshold snapshot and streams/details. | Null TSS; zero-filled sample arrays. | Garmin activities do not feed training load correctly. | Run same calculation engine after detailed samples are normalized. |
| A09 | Critical | Planned workout TSS | `WorkoutCalculator.calculateStep` | `TSS = duration * IF^2 * 100 / 3600`; IF inferred from hard-coded zone/type maps. | User sport threshold and zone settings. | Defaults: duration 300s, distance 1000m, IF 0.70; FTP 250, LTHR 160, threshold pace 270, zone IF map. | Planned TSS and calendar load can diverge from TrainingPeaks/Intervals even before activity completion. | Replace with threshold-aware planned load calculator; if threshold missing, return incomplete/error instead of fallback. |
| A10 | Critical | Calendar analysis zone bounds | `CalendarEventService.analyze`, `findUserSportZones` | Loads one `sport_zones` row by sport only; treats zone JSON `min/max` as percentages and multiplies by FTP/LTHR. | Correct row by `sport + zone_type + effective_date`; absolute or percent zones interpreted by unit. | FTP 250, LTHR 165, maxHR 185; default zone percent tables; one-row ambiguity. | Power zone 243-285 W can become 607-713 W if read as 243%-285% of FTP. | Query zone_type-specific rows; keep unit semantics explicit; do not multiply absolute zone bounds. |
| A11 | High | Calendar analysis cache | `CalendarEventService.analyze` | Cache key is `(eventId, locale)`. | Include threshold version/effective date and activity update version. | Threshold updates do not invalidate analysis. | Stale compliance and zone analysis after threshold changes. | Include threshold row IDs/hash and activity updated_at in cache key, or evict on update. |
| A12 | High | Zone distribution aggregation | `AnalyticsQueryAdapter.aggregateStreamZones` | `COUNT(*)` samples as seconds; ignores timestamps; no sentinel/NaN filtering. | Time-weighted by stream timestamp deltas, valid samples only. | Sample = 1s assumption; invalid sentinels may be counted. | Wrong zone durations for variable sampling, missing data, pauses, manual uploads. | Use timestamps/sample duration and filter `Short.MIN_VALUE`, `Integer.MIN_VALUE`, `NaN`, <=0 where invalid. |
| A13 | High | Power curve | `AnalyticsService.getPowerCurve`, `findBestMeanMaximalPower` | Sport is resolved but not passed to SQL; rolling window is `durationSeconds` rows. | Sport-specific streams; time-based rolling windows. | All sports included; sample count equals seconds. | Running/rowing/other power can pollute cycling curve; variable sample rates distort MMP. | Add sport filter and timestamp-aware rolling average. |
| A14 | High | Garmin workout export / sync threshold context | `WorkoutService.buildZoneContext`, `GarminTrainingSyncService.loadZoneContext` | FIT export falls back FTP 200/LTHR 160/pace 300; Garmin sync queries `athlete_profiles.ftp_watts/lthr_bpm`. | `sport_zones` by sport/zone_type/effective_date. | Hard-coded defaults; nonexistent `athlete_profiles` columns. | Workout targets exported to Garmin/FIT can be wrong or fail. | Replace `ZoneContext.defaults()` with required threshold snapshot from `sport_zones`. |
| A15 | High | Frontend activity power tab | `ActivityPowerTab` | Defaults FTP 149, weight 75, maxHR 170; hard-coded power/HR zones; mock zone durations and power curve if no stream. | Backend-calculated metrics and user threshold settings. | Mock samples, fixed zone percentages, `maxHR * 0.9` as LTHR. | UI can display fabricated analytics. | Remove synthetic data; use backend activity metrics and zone config; show empty state when data is absent. |
| A16 | High | Frontend HR/Pace tabs | `ActivityHrTab`, `ActivityPaceTab` | Defaults LTHR 154/maxHR 170/pace 300 or 100; hard-coded zone percentages; mock zones. | User HR/pace zones from Threshold Settings. | LTHR/default HR/pace; fixed zone tables; mock data. | HR/pace charts can contradict backend and reference platforms. | Consume backend zone distributions or threshold config; no mock analytics on real activity page. |
| A17 | Medium | Weekly summary CTL/ATL estimates | `WeeklySummaryColumn` | Estimates ATL=`weeklyTSS/7`, CTL=`weeklyTSS/42`, TSB=`CTL-ATL`; estimates zones from IF distributions. | Backend `training_load` values. | Explicit approximation; calorie/elevation rates; TID thresholds. | Dashboard weekly panel will not match PMC/reference. | Use backend PMC/training load; label non-threshold heuristics separately if retained. |
| A18 | Medium | Coach/dashboard status labels | `CoachAlertEngine`, `CoachAthleteDataService`, `FitnessStatusBadge`, `PMCChart` | TSB and ACWR labels use fixed thresholds. | Business configuration, not Threshold Settings. | TSB -20, +5, +10; ACWR 0.8/1.3/1.5. | Labels may be acceptable as business rules, but should not influence calculations. | Move to config and document as display rules only. |
| A19 | Medium | Settings UI zone display | `ZonesSection.ZoneRow` | Shows fixed percent ranges even when actual zone JSON differs. | Actual stored zones and selected zone method. | Common-zone percent table. | Settings page can mislead user about the saved source of truth. | Display actual min/max from `sportData.zones`; show derived percentages only as secondary if applicable. |
| A20 | Medium | Coach athlete zones query | `CoachAthleteQueryAdapter.findZones` | `DISTINCT ON (sport)` returns one row per sport, ignoring `zone_type`. | All zone types for sport. | Drops HR/power/pace rows arbitrarily. | Coach view loses threshold data. | Query by `(sport, zone_type)` and return full zone set. |

## Detailed Findings

### 1. Threshold Settings Are Not Queried Consistently

Source:

- `backend/src/main/resources/db/migration/V006__create_sport_zones.sql:1`
- `backend/src/main/java/com/coachfit/athlete/domain/model/SportZone.java:14`
- `backend/src/main/java/com/coachfit/athlete/application/service/AthleteService.java:52`
- `backend/src/main/resources/db/seed/V900__demo_seed_data.sql:251`

Observed:

- `sport_zones` stores `sport`, `zone_type`, `ftp`, `lthr`, `max_hr`, `zones`, `effective_date`.
- Domain and request DTO use primitive `int min/max`, blocking null open-ended zones.
- Seed data stores HR zone type as `hr`, but services and analytics expect `heart_rate`.
- Multiple consumers query only by `sport`, not `zone_type`, so whichever row is latest can be selected.

Expected:

- Every calculation should load a `ThresholdSnapshot` by `user_id`, `sport`, `zone_type`, and activity/planned date.
- The snapshot should include threshold values, zone row IDs, effective date, unit semantics, and nullable zone bounds.

Impact:

- Zones can be missing, wrong, or impossible to represent.
- Historical activities can be recalculated with the latest threshold instead of the threshold active on the activity date.

Fix:

- Normalize zone type values.
- Allow nullable zone bounds.
- Add a central query API such as:

```java
ThresholdSnapshot snapshot = thresholds.resolve(userId, sport, date, Set.of(POWER, HEART_RATE, PACE));
```

Calculators should fail with `INSUFFICIENT_THRESHOLD_SETTINGS` instead of using silent defaults.

### 2. Activity Metrics Are Not Recalculated From Threshold Settings

Sources:

- `backend/src/main/java/com/coachfit/activity/application/service/parser/FitParser.java:95`
- `backend/src/main/java/com/coachfit/activity/application/service/parser/TcxParser.java:161`
- `backend/src/main/java/com/coachfit/activity/application/service/parser/GpxParser.java:112`
- `backend/src/main/java/com/coachfit/activity/adapter/out/persistence/ActivityPersistenceAdapter.java:56`
- `backend/src/main/java/com/coachfit/sync/application/service/StravaActivitySyncService.java:194`
- `backend/src/main/java/com/coachfit/sync/application/service/GarminActivitySyncService.java:178`

Current behavior:

- Manual FIT imports persist provider NP/IF/TSS if present.
- TCX and GPX persist NP/IF/TSS as null.
- Strava computes NP but leaves IF/TSS null for power because FTP loading is TODO.
- Strava HR fallback uses default resting HR, max HR, and gender.
- Garmin stores metrics with NP/IF/TSS null.

Reference formula:

```text
NP = fourth_root(avg((30s rolling average power)^4))
IF = NP / FTP
TSS = (duration_seconds * NP * IF) / (FTP * 3600) * 100
```

Expected inputs:

- Power stream, timestamps/moving time.
- FTP active on activity date for the relevant sport.
- Optional HR/pace load only if configured in Threshold Settings/load method.

Impact:

- Same file + same threshold can still produce different load because local app may use provider TSS, null TSS, or hard-coded HR fallback.

Fix:

- Add `ActivityMetricsCalculationService`.
- Recompute metrics after every import/sync/upload and after threshold changes.
- Store calculation provenance:

```json
{
  "formulaVersion": "power-tss-v1",
  "thresholdRows": ["sport_zones.id"],
  "thresholdEffectiveDate": "YYYY-MM-DD",
  "inputStreams": ["power", "timestamps"],
  "samplingPolicy": "moving-time-timestamp-weighted"
}
```

### 3. Planned Workout TSS Uses Hard-coded IF and Thresholds

Sources:

- `backend/src/main/java/com/coachfit/shared/domain/workout/WorkoutCalculator.java:17`
- `backend/src/main/java/com/coachfit/workout/application/service/WorkoutService.java:107`
- `backend/src/main/java/com/coachfit/calendar/application/service/ExternalCalendarEventService.java:241`
- `backend/src/main/java/com/coachfit/calendar/application/service/CalendarEventService.java:780`

Current formula:

```text
planned_TSS = duration_seconds * IF^2 * 100 / 3600
```

But IF comes from:

- Zone map: Z1=0.55, Z2=0.65, Z3=0.80, Z4=0.95, Z5=1.05, Z6=1.20, Z7=1.40.
- `power_watts`: average watts / 250.
- `hr_bpm`: average bpm / 160.
- `pace`: 270 / average pace.
- Missing target: 0.50, 0.65, 0.70, 0.75 depending step type.

Expected:

- For percent targets, IF may come from percent if target is explicitly threshold-relative.
- For absolute watts/bpm/pace/zone targets, convert through the user's Threshold Settings active on the planned workout date.
- For missing thresholds, planned TSS should be unavailable, not guessed.

Impact:

- Planned TSS, calendar load, workouts exported to providers, and weekly load estimates can be wrong by design.

Fix:

- Replace `WorkoutCalculator.calculate(stepsJson, sport)` with a threshold-aware API:

```java
calculatePlannedWorkout(stepsJson, sport, plannedDate, ThresholdSnapshot snapshot)
```

### 4. Calendar Compliance Analysis Misuses Zones

Sources:

- `backend/src/main/java/com/coachfit/calendar/application/service/CalendarEventService.java:503`
- `backend/src/main/java/com/coachfit/calendar/adapter/out/persistence/CalendarEventPersistenceAdapter.java:565`

Current behavior:

- Loads one `sport_zones` row by sport and date, without zone type.
- Defaults FTP=250, LTHR=165, maxHR=185.
- If target is `power_zone`, `getZoneBounds()` reads JSON `min/max`, then treats them as percentages and multiplies by FTP.
- `hr_pct` uses max HR, while FIT/Garmin export uses LTHR.
- Actual zone estimation ignores `zonesJson` and uses fixed percent breakpoints.
- Missing streams are replaced by proportional splits from whole-activity summary.

Example failure:

- Stored power Z4: `min=243`, `max=285` watts.
- Calendar analysis: `243 / 100 * ftp` to `285 / 100 * ftp`.
- With FTP 250, target becomes 607 W to 713 W.

Impact:

- Compliance score and zone match can be very wrong and then written back to `calendar_events`.

Fix:

- Query zone rows by zone_type.
- Preserve unit semantics:
  - absolute watts/bpm/pace zones: compare directly.
  - percent zones: multiply by threshold.
- Remove proportional fallback from compliance scoring or mark analysis incomplete.

### 5. Analytics Zone Distribution and Power Curve Are Not Trustworthy

Sources:

- `backend/src/main/java/com/coachfit/analytics/application/service/AnalyticsService.java:86`
- `backend/src/main/java/com/coachfit/analytics/application/service/AnalyticsService.java:123`
- `backend/src/main/java/com/coachfit/analytics/adapter/out/AnalyticsQueryAdapter.java:100`
- `backend/src/main/java/com/coachfit/analytics/adapter/out/AnalyticsQueryAdapter.java:171`
- `backend/src/main/java/com/coachfit/analytics/adapter/out/AnalyticsQueryAdapter.java:260`

Issues:

- Power curve accepts `sport` but SQL does not filter by sport.
- Power curve treats `durationSeconds` as sample count.
- Zone boundary query references non-existent `status`.
- All-sport zone distribution uses cycling boundaries for all sports.
- Aggregation counts samples as seconds and ignores timestamps.
- Invalid sentinel values from manual uploads are not filtered.
- Parse failure returns empty zone list silently.

Impact:

- Analytics endpoints can fail or return wrong data even if thresholds are configured correctly.

Fix:

- Add sport filter to power curve SQL.
- Use timestamp-weighted windows.
- Load boundaries per sport/zone_type/effective date.
- Filter invalid samples.
- Return explicit errors for malformed zone JSON.

### 6. FIT/Garmin Workout Export Uses Defaults When Thresholds Are Missing

Sources:

- `backend/src/main/java/com/coachfit/shared/domain/workout/ZoneContext.java:16`
- `backend/src/main/java/com/coachfit/workout/application/service/WorkoutService.java:220`
- `backend/src/main/java/com/coachfit/workout/domain/FitEncoder.java:249`
- `backend/src/main/java/com/coachfit/sync/application/service/GarminTrainingSyncService.java:216`
- `backend/src/main/java/com/coachfit/sync/application/service/GarminTrainingSyncService.java:319`

Current behavior:

- `ZoneContext.defaults()` returns FTP 200, LTHR 160, threshold pace 300.
- `WorkoutService.buildZoneContext` uses fallbacks 200/160/300.
- FIT/Garmin pace conversion falls back to running 300s/km or swimming 100s/100m if threshold pace <= 0.
- Garmin sync queries `athlete_profiles.ftp_watts` and `athlete_profiles.lthr_bpm`, which are not in the migration.

Impact:

- Structured workout targets uploaded to Garmin/FIT can be incorrect even if user has `sport_zones`.
- Garmin workout sync may fail because of schema mismatch.

Fix:

- Make threshold snapshot mandatory for export of threshold-relative targets.
- Remove `ZoneContext.defaults()` or restrict it to test fixtures.
- Query `sport_zones`, not athlete profile columns.

### 7. Training Load Engine Is Missing

Sources:

- `backend/src/main/resources/db/migration/V011__create_training_load.sql:4`
- `backend/src/main/resources/db/migration/V020__add_training_load_is_dirty.sql:1`
- `rg "INSERT INTO training_load|UPDATE training_load" backend/src/main/java` returned no Java writer.

Expected formulas:

```text
daily_tss(date, sport) = sum(activity.tss for that day/sport)
CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) / 42
ATL_today = ATL_yesterday + (TSS_today - ATL_yesterday) / 7
TSB_today = CTL_yesterday - ATL_yesterday   // TrainingPeaks convention
```

Note: Intervals.icu has historically displayed form differently in some cases, and allows changing fitness/fatigue days. Pick and document the platform convention explicitly.

Impact:

- Dashboard, analytics PMC, coach roster, and alerts read a table that is not maintained by the application.

Fix:

- Implement recalculation from earliest dirty date per user/sport.
- Recalculate `all` rollup from sport rows.
- Mark dirty on activity create/update/delete and threshold updates.

### 8. Frontend Recomputes and Fabricates Analytics

Sources:

- `frontend/src/components/activities/detail/ActivityPowerTab.tsx:50`
- `frontend/src/components/activities/detail/ActivityPowerTab.tsx:103`
- `frontend/src/components/activities/detail/ActivityHrTab.tsx:49`
- `frontend/src/components/activities/detail/ActivityHrTab.tsx:97`
- `frontend/src/components/activities/detail/ActivityPaceTab.tsx:45`
- `frontend/src/components/activities/detail/ActivityPaceTab.tsx:127`
- `frontend/src/components/calendar/WeeklySummaryColumn.tsx:185`
- `frontend/src/components/settings/ZonesSection.tsx:66`

Observed:

- Power tab defaults FTP=149, weight=75, maxHR=170.
- HR tab defaults LTHR=154, restingHR=53, maxHR=170.
- Pace tab defaults threshold pace to 300s/km or 100s/100m.
- Power/HR/pace tabs fabricate zone durations and curves when no stream exists.
- HR zones are derived from fixed percentages or `maxHr * 0.9`.
- Weekly summary estimates CTL/ATL from one week of TSS and fabricates zone distribution from IF.
- Settings UI displays fixed zone percentages independent of actual stored zones.

Impact:

- User-facing reports/charts may not reflect backend or Threshold Settings.
- Hard to validate against reference platforms because frontend can overwrite perception.

Fix:

- Activity detail pages should display backend-calculated metrics and zone distributions.
- If frontend computes derived values for interactivity, it must use `SportZones` from settings and no synthetic data.
- Missing data should render an explicit empty state.

## Recommended Remediation Plan

### Phase 1: Stop Silent Wrong Calculations

1. Remove or quarantine all threshold defaults in production paths:
   - FTP 200/250/149.
   - LTHR 160/165/154.
   - maxHR 170/185/190.
   - threshold pace 270/300/100.
2. Return an explicit incomplete-calculation status when thresholds are missing.
3. Migrate `sport_zones.zone_type = 'hr'` to `'heart_rate'`.
4. Remove the analytics `status = 'active'` filter or add the column intentionally.
5. Remove frontend mock analytics from real activity tabs.

### Phase 2: Centralize Threshold Resolution

Create one threshold resolver used by import, sync, planned workouts, calendar analysis, analytics, export, dashboard, and reports.

Required snapshot fields:

- `userId`
- `sport`
- `asOfDate`
- `powerThresholdWatts`
- `lthrBpm`
- `maxHrBpm`
- `thresholdPace`
- `powerZones`
- `heartRateZones`
- `paceZones`
- `sourceRowIds`
- `effectiveDates`
- `formulaVersion`

### Phase 3: Build One Calculation Engine

Required calculators:

- `PowerMetricsCalculator`: NP, IF, TSS, VI, power zones, MMP.
- `HeartRateMetricsCalculator`: HR zones, HRSS/hrTSS only with explicit method/config.
- `PaceMetricsCalculator`: threshold pace load, pace zones, NGP/grade policy if supported.
- `WorkoutPlanLoadCalculator`: planned TSS from steps and threshold snapshot.
- `TrainingLoadCalculator`: daily TSS, CTL, ATL, TSB.

### Phase 4: Recalculation and Provenance

1. Store metric provenance with threshold row IDs and formula version.
2. On threshold update, mark affected activities/training load dirty from `effective_date`.
3. Recompute all dependent outputs:
   - activities NP/IF/TSS/load
   - zone distributions
   - calendar compliance
   - training_load PMC
   - dashboard/coach stats

### Phase 5: Golden Validation

Create fixtures with:

- Same workout file.
- Same threshold settings.
- Exported TrainingPeaks activity metrics.
- Exported Intervals.icu activity metrics/load.

Minimum golden tests:

1. Cycling FIT with 1 Hz power, no pauses.
2. Cycling FIT with pauses and missing power samples.
3. HR-only run with LTHR/maxHR/restingHR configured.
4. Running pace workout with threshold pace and GPS stream.
5. Historical activity before and after threshold change.
6. Open-ended zones with null min/max.
7. Multi-sport week producing CTL/ATL/TSB and all-sport rollup.

Acceptance rule:

- Power NP/IF/TSS should match TrainingPeaks/Intervals within documented rounding/moving-time policy.
- HR and pace load must document the selected method because platforms differ more for non-power load.

## Immediate Fix Checklist

- [ ] Migrate seed and existing data from `zone_type='hr'` to `heart_rate`.
- [ ] Change zone DTO/domain min/max to nullable.
- [ ] Remove `status = 'active'` from analytics zone query or add a real status column.
- [ ] Add sport filter to power curve SQL.
- [ ] Remove all production uses of `ZoneContext.defaults()`.
- [ ] Replace `WorkoutCalculator` with threshold-aware planned load.
- [ ] Implement activity recalculation for Strava/Garmin/manual uploads.
- [ ] Implement `training_load` writer/recalculation.
- [ ] Remove frontend fabricated activity analytics.
- [ ] Add provenance and dirty recalculation on threshold updates.

