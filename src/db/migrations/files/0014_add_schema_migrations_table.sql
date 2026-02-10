-- Migration: 1.4.0
-- Description: Add schema_migrations table for tracking migration history
-- Breaks: false
-- Dependencies: []

-- Create migration history table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT NOT NULL,
  duration_ms INTEGER,
  success INTEGER DEFAULT 1
);

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version
  ON schema_migrations(version);
