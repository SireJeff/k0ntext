/**
 * Cleanup configuration options
 */

export interface CleanupConfig {
  /** Default dry run mode (safe mode) */
  dryRun: boolean;

  /** Default folders to keep */
  defaultKeep: string[];

  /** Verbose output by default */
  verbose: boolean;

  /** Maximum folder depth to scan */
  maxDepth: number;

  /** Timeout for folder operations in milliseconds */
  timeout: number;
}

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  dryRun: true,
  defaultKeep: ['.github', '.vscode', '.idea', '.devcontainer'],
  verbose: false,
  maxDepth: 3,
  timeout: 30000,
  cwd: process.cwd()
};

/**
 * Get cleanup configuration (can be extended to load from file)
 */
export function getCleanupConfig(): CleanupConfig {
  return { ...DEFAULT_CLEANUP_CONFIG };
}