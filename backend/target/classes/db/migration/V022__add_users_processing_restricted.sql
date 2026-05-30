-- Add processing_restricted column to users table.
-- Supports PUT /api/v1/account/restrict (Right to Restrict Processing, GDPR Art. 18).
-- docs/11-privacy-compliance.md §3.5
ALTER TABLE users ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN NOT NULL DEFAULT false;
