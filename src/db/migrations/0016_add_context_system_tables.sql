-- Migration 0016: Context System and TodoList Support
-- From: 1.5.0
-- To: 1.6.0

-- Todo sessions (for tracking across compactions)
CREATE TABLE IF NOT EXISTS todo_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  parent_session TEXT,
  metadata JSON
);

-- Todo tasks
CREATE TABLE IF NOT EXISTS todo_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  dependencies TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (session_id) REFERENCES todo_sessions(id) ON DELETE CASCADE
);

-- File timestamps for sync tracking
CREATE TABLE IF NOT EXISTS file_timestamps (
  path TEXT PRIMARY KEY,
  modified_time TEXT NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  last_checked TEXT NOT NULL DEFAULT (datetime('now')),
  git_commit TEXT
);
