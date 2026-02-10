/**
 * Template Sync Types
 *
 * All type definitions for the template sync system.
 */

/**
 * Template file metadata
 */
export interface TemplateFile {
  /** Relative path from .claude/ or templates/base/.claude/ */
  relativePath: string;
  /** Content hash (SHA-256, 16 chars) */
  hash: string;
  /** File size in bytes */
  size: number;
  /** Last modified time */
  mtime: Date;
}

/**
 * Template manifest structure (stored in DB and .claude/.k0ntext-manifest.json)
 */
export interface TemplateManifest {
  /** k0ntext version that generated this manifest */
  k0ntextVersion: string;
  /** Template source version */
  templateVersion: string;
  /** Timestamp when manifest was created */
  createdAt: string;
  /** Timestamp when manifest was last updated */
  updatedAt?: string;
  /** All tracked template files keyed by relative path */
  files: Record<string, TemplateFileEntry>;
}

/**
 * Single file entry in manifest
 */
export interface TemplateFileEntry {
  /** Content hash */
  hash: string;
  /** Template version when file was last updated */
  templateVersion: string;
  /** Whether user has modified this file */
  userModified: boolean;
  /** Last sync timestamp */
  lastSyncedAt?: string;
  /** Original template hash (before user modification) */
  originalHash?: string;
}

/**
 * Comparison result for a single file
 */
export interface FileComparison {
  /** Relative path from .claude/ */
  path: string;
  /** Current state */
  state: FileState;
  /** Template hash (from package) */
  templateHash: string;
  /** Local hash (from .claude/) */
  localHash: string;
  /** Whether user has modified (from manifest) */
  userModified: boolean;
  /** Original template hash (if user modified) */
  originalHash?: string;
}

/**
 * File state after comparison
 */
export type FileState =
  | 'identical'      // File matches template exactly
  | 'safe-update'    // Template changed, file not modified by user
  | 'conflict'       // Template changed AND user modified file
  | 'new'            // File exists in template but not locally
  | 'deleted'        // File exists locally but not in template (user-added)
  | 'user-only';     // User-only file, not in template

/**
 * Sync operation result
 */
export interface SyncResult {
  /** Total files processed */
  total: number;
  /** Files updated (safe merge) */
  updated: number;
  /** Files skipped (user modified/conflict) */
  skipped: string[];
  /** New files created */
  created: number;
  /** Files in conflict requiring resolution */
  conflicts: FileComparison[];
  /** User-only files (deleted from template) */
  userOnly: string[];
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Dry run - don't make changes */
  dryRun?: boolean;
  /** Force update all files (skip prompts, overwrite user modifications) */
  force?: boolean;
  /** Specific subdirectories to sync */
  subdirectories?: TemplateSubdir[];
  /** Verbose output */
  verbose?: boolean;
  /** Whether to archive removed files */
  archiveRemoved?: boolean;
}

/**
 * Template subdirectories (synced from package)
 */
export type TemplateSubdir =
  | 'commands'
  | 'agents'
  | 'schemas'
  | 'standards'
  | 'tools'
  | 'automation';

/**
 * Excluded subdirectories (user-specific, not synced)
 */
export type ExcludedSubdir = 'context' | 'indexes';

/**
 * Template source configuration
 */
export interface TemplateSource {
  /** Root path to templates (e.g., templates/base/.claude/) */
  rootPath: string;
  /** Subdirectories to sync */
  subdirectories: TemplateSubdir[];
}

/**
 * Merge result for a single file
 */
export interface MergeResult {
  /** File path */
  path: string;
  /** Whether merge was successful */
  success: boolean;
  /** Merge method used */
  method: MergeMethod;
  /** Diff if available */
  diff?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Merge method used
 */
export type MergeMethod =
  | 'auto-safe'      // Automatic safe update (no user changes)
  | 'auto-create'    // Automatic new file creation
  | 'overwrite'      // Forced overwrite (user confirmed or --force)
  | 'skip'           // Skipped (user chose to keep local)
  | 'conflict';      // Conflict detected, requires resolution

/**
 * Resolution choice for conflicts
 */
export type ResolutionChoice = 'skip' | 'overwrite' | 'keep-local' | 'show-diff';

/**
 * Resolution result for a single conflict
 */
export interface ResolutionResult {
  /** File path */
  path: string;
  /** User's choice */
  choice: ResolutionChoice;
}

/**
 * Archive result for removed files
 */
export interface ArchiveResult {
  /** Files that were archived */
  archived: string[];
  /** Archive path */
  archivePath: string;
}

/**
 * Template file record from database
 */
export interface TemplateFileRecord {
  id: string;
  relativePath: string;
  templateHash: string;
  templateVersion: string;
  userModified: boolean;
  lastSyncedAt?: string;
  syncedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Template manifest record from database
 */
export interface TemplateManifestRecord {
  id: string;
  k0ntextVersion: string;
  templateVersion: string;
  manifest: string;
  createdAt: string;
}

/**
 * All template subdirectories
 */
export const TEMPLATE_SUBDIRS: TemplateSubdir[] = [
  'commands',
  'agents',
  'schemas',
  'standards',
  'tools',
  'automation'
];

/**
 * All excluded subdirectories
 */
export const EXCLUDED_SUBDIRS: ExcludedSubdir[] = ['context', 'indexes'];

/**
 * Default sync options
 */
export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  dryRun: false,
  force: false,
  verbose: false,
  archiveRemoved: true
};
