/**
 * Migration System Types
 *
 * Type definitions for the database migration system.
 */

/**
 * Migration metadata
 */
export interface Migration {
  /** Schema version (e.g., '1.4.0') */
  version: string;
  /** Human-readable description */
  description: string;
  /** Whether this is a breaking change */
  breaks: boolean;
  /** Required previous versions */
  dependencies: string[];
  /** SQL file path */
  sqlPath: string;
  /** TypeScript file path (optional) */
  tsPath?: string;
  /** Computed checksum */
  checksum: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  /** Migration version */
  version: string;
  /** Whether successful */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  /** Current schema version in database */
  currentVersion: string | null;
  /** Target schema version (from SCHEMA_VERSION constant) */
  targetVersion: string;
  /** Pending migrations */
  pending: Migration[];
  /** Applied migrations */
  applied: Array<{ version: string; appliedAt: string }>;
  /** Whether migration is needed */
  needsMigration: boolean;
}

/**
 * Migration runner options
 */
export interface MigrationOptions {
  /** Dry run - don't apply changes */
  dryRun?: boolean;
  /** Force migration even if validation fails */
  force?: boolean;
  /** Create backup before migration */
  backup?: boolean;
  /** Batch size for progress reporting */
  batchSize?: number;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number, migration: Migration) => void;
}
