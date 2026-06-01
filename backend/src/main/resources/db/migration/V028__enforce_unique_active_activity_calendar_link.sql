-- Keep one active calendar event per activity.
-- Existing duplicate standalone activity cards are soft-deleted; duplicate planned
-- workout links are detached back to planned before the unique index is added.

WITH ranked AS (
    SELECT id,
           workout_id,
           ROW_NUMBER() OVER (
               PARTITION BY activity_id
               ORDER BY
                   CASE WHEN workout_id IS NOT NULL THEN 0 ELSE 1 END,
                   updated_at DESC,
                   created_at DESC,
                   id
           ) AS rn
      FROM calendar_events
     WHERE activity_id IS NOT NULL
       AND deleted_at IS NULL
)
UPDATE calendar_events c
   SET activity_id      = NULL,
       compliance_score = NULL,
       status           = 'planned',
       updated_at       = now()
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn > 1
   AND r.workout_id IS NOT NULL;

WITH ranked AS (
    SELECT id,
           workout_id,
           ROW_NUMBER() OVER (
               PARTITION BY activity_id
               ORDER BY
                   CASE WHEN workout_id IS NOT NULL THEN 0 ELSE 1 END,
                   updated_at DESC,
                   created_at DESC,
                   id
           ) AS rn
      FROM calendar_events
     WHERE activity_id IS NOT NULL
       AND deleted_at IS NULL
)
UPDATE calendar_events c
   SET deleted_at = now(),
       updated_at = now()
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn > 1
   AND r.workout_id IS NULL;

CREATE UNIQUE INDEX uq_calendar_events_active_activity
    ON calendar_events (activity_id)
    WHERE activity_id IS NOT NULL AND deleted_at IS NULL;
