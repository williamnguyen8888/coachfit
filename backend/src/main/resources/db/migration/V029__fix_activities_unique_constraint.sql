-- V029__fix_activities_unique_constraint.sql
-- Drop the constraint that treated NULL values as NOT distinct (preventing multiple manual uploads)
-- Re-create it as a standard UNIQUE constraint (which treats NULLs as distinct)

ALTER TABLE activities
    DROP CONSTRAINT uq_activities_user_source_source_id;

ALTER TABLE activities
    ADD CONSTRAINT uq_activities_user_source_source_id
    UNIQUE (user_id, source, source_id);
