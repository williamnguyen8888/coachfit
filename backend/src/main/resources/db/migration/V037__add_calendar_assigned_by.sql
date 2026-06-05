-- V037__add_calendar_assigned_by.sql
-- Add assigned_by to calendar_events to track coach workout assignments.
-- docs/02-phase-plan.md §Backend — Workout Assignment

ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(20);  -- null = self-assigned, 'coach' = assigned by coach
