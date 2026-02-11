-- Migration: 1.5.0
-- Description: Add version tracking columns to sync_state table
-- Breaks: false
-- Dependencies: 1.4.0

-- Add k0ntext_version column to track package version when sync occurred
-- Note: Existing rows will have NULL for this column
ALTER TABLE sync_state ADD COLUMN k0ntext_version TEXT;

-- Add user_modified flag to track if user manually edited the synced file
ALTER TABLE sync_state ADD COLUMN user_modified INTEGER DEFAULT 0;

-- Add last_checked timestamp for version checking (ISO 8601 format)
ALTER TABLE sync_state ADD COLUMN last_checked TEXT;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_state_version ON sync_state(k0ntext_version);
CREATE INDEX IF NOT EXISTS idx_sync_state_user_modified ON sync_state(user_modified);
