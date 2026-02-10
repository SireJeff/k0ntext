/**
 * Version Detection Types
 *
 * Type definitions for version detection and checking system.
 */

/**
 * Update type classification
 */
export type UpdateType = 'major' | 'minor' | 'patch' | 'none';

/**
 * Single file version status
 */
export interface FileVersionStatus {
  /** Tool name (claude, copilot, etc.) */
  tool: string;
  /** Full path to the file */
  filePath: string;
  /** Whether the file exists on disk */
  exists: boolean;
  /** Version string found in the file (if any) */
  fileVersion: string | null;
  /** Whether the file has a version marker */
  hasMarker: boolean;
  /** Whether the file is outdated compared to current version */
  isOutdated: boolean;
  /** Type of update needed (if outdated) */
  updateType: UpdateType;
  /** Whether the file has been modified by the user */
  userModified: boolean;
  /** Last time the file was checked */
  lastChecked?: string;
}

/**
 * Outdated file summary for prompting
 */
export interface OutdatedFile {
  tool: string;
  filePath: string;
  fileVersion: string;
  currentVersion: string;
  updateType: UpdateType;
  userModified: boolean;
}

/**
 * Version check result
 */
export interface VersionCheckResult {
  /** Current k0ntext package version */
  currentVersion: string;
  /** Total files checked */
  checked: number;
  /** List of outdated files */
  outdated: OutdatedFile[];
  /** List of up-to-date files */
  upToDate: FileVersionStatus[];
  /** List of files with no version marker */
  noVersion: FileVersionStatus[];
}

/**
 * Version check options
 */
export interface CheckOptions {
  /** Project root directory */
  projectRoot: string;
  /** Current k0ntext version */
  currentVersion: string;
  /** Specific tools to check (empty = all) */
  tools?: string[];
  /** Force re-check even if recently checked */
  force?: boolean;
  /** Whether to check file modifications */
  checkModifications?: boolean;
}

/**
 * Regeneration choice from user prompt
 */
export type RegenerationChoice = 'all' | 'outdated' | 'select' | 'skip';

/**
 * Prompt result for regeneration
 */
export interface RegenerationPromptResult {
  /** User's choice */
  choice: RegenerationChoice;
  /** Selected tools if choice is 'select' */
  selectedTools?: string[];
  /** Whether to include modified files */
  includeModified: boolean;
}
