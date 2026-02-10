/**
 * Template Comparator
 *
 * Compares template files with local files to detect changes.
 * Determines file state: identical, safe-update, conflict, new, deleted, user-only.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { TemplateHasher } from './hasher.js';
import { TemplateManifestManager } from './manifest.js';
import { TemplateScanner } from './scanner.js';
import type { DatabaseClient } from '../db/client.js';
import type { FileComparison, FileState, TemplateFile, TemplateSubdir, TemplateFileEntry } from './types.js';

/**
 * Comparison options
 */
export interface ComparisonOptions {
  /** Subdirectories to compare (default: all) */
  subdirectories?: TemplateSubdir[];
  /** Whether to check user modifications from manifest */
  checkUserModifications?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Comparison result with metadata
 */
export interface ComparisonResult {
  /** File comparisons */
  comparisons: FileComparison[];
  /** Count by state */
  counts: Record<FileState, number>;
  /** Total files compared */
  total: number;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Compares template versions to detect changes
 */
export class TemplateComparator {
  private manifestManager: TemplateManifestManager;
  private verbose: boolean = false;

  constructor(
    private db: DatabaseClient,
    private projectRoot: string = process.cwd(),
    private templateRoot: string,
    verbose: boolean = false
  ) {
    this.manifestManager = new TemplateManifestManager(db, projectRoot);
    this.verbose = verbose;
  }

  /**
   * Compare template files with local files
   *
   * @param options - Comparison options
   * @returns Array of file comparisons
   */
  async compare(options: ComparisonOptions = {}): Promise<ComparisonResult> {
    const startTime = Date.now();

    // Load manifest for user modification tracking
    const manifest = await this.manifestManager.loadReconciledManifest();

    // Define paths
    const templateBasePath = this.templateRoot;
    const localBasePath = path.join(this.projectRoot, '.claude');

    // Scan template files
    const templateFiles = await TemplateScanner.scanAndHash(
      templateBasePath,
      options.subdirectories
    );

    // Scan local files
    const localFiles = await this.scanLocalFiles(localBasePath, options.subdirectories);

    // Build comparison map
    const comparisons = await this.buildComparisons(
      templateFiles,
      localFiles,
      manifest,
      templateBasePath,
      localBasePath
    );

    // Count by state
    const counts = this.countByState(comparisons);

    return {
      comparisons,
      counts,
      total: comparisons.length,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Scan local files in .claude/
   *
   * @param localBasePath - Base path to .claude/
   * @param subdirectories - Subdirectories to scan
   * @returns Map of relative path to hash
   */
  private async scanLocalFiles(
    localBasePath: string,
    subdirectories?: TemplateSubdir[]
  ): Promise<Map<string, { hash: string; exists: boolean }>> {
    const localFiles = new Map<string, { hash: string; exists: boolean }>();

    try {
      const dirs = subdirectories ?? TemplateScanner.getSyncedSubdirs();

      for (const subdir of dirs) {
        const dirPath = path.join(localBasePath, subdir);

        try {
          // Read directory entries directly
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          if (this.verbose) {
            console.log(`[DEBUG] Scanning local directory: ${dirPath}`);
            console.log(`[DEBUG] Found ${entries.length} entries`);
          }

          for (const entry of entries) {
            if (entry.isFile() && !this.shouldExcludeFile(entry.name)) {
              const fullPath = path.join(dirPath, entry.name);
              const hash = await TemplateHasher.hashFileSafe(fullPath);
              // Normalize to forward slashes for consistency
              const relativePath = path.join(subdir, entry.name).split(path.sep).join('/');
              if (this.verbose) {
                console.log(`[DEBUG] Found local file: ${relativePath} (hash: ${hash})`);
              }
              localFiles.set(relativePath, {
                hash,
                exists: true
              });
            } else if (entry.isDirectory()) {
              // Recursively scan subdirectories within this subdir
              await this.scanLocalFilesRecursive(
                path.join(dirPath, entry.name),
                path.join(subdir, entry.name),
                localFiles
              );
            }
          }
        } catch (error) {
          // Directory doesn't exist - skip
          if (this.verbose) {
            console.log(`[DEBUG] Error scanning ${dirPath}: ${(error as NodeJS.ErrnoException).code || error}`);
          }
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.warn(`Warning: Could not scan ${dirPath}: ${error}`);
          }
        }
      }

      if (this.verbose) {
        console.log(`[DEBUG] Total local files found: ${localFiles.size}`);
      }
    } catch (error) {
      // Base directory doesn't exist yet - return empty map
      if (this.verbose) {
        console.log(`[DEBUG] Base directory error: ${error}`);
      }
    }

    return localFiles;
  }

  /**
   * Recursively scan local files within a subdirectory
   */
  private async scanLocalFilesRecursive(
    dirPath: string,
    relativePrefix: string,
    localFiles: Map<string, { hash: string; exists: boolean }>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && !this.shouldExcludeFile(entry.name)) {
          const fullPath = path.join(dirPath, entry.name);
          const hash = await TemplateHasher.hashFileSafe(fullPath);
          // Normalize to forward slashes for consistency
          const relativePath = path.join(relativePrefix, entry.name).split(path.sep).join('/');
          localFiles.set(relativePath, {
            hash,
            exists: true
          });
        } else if (entry.isDirectory()) {
          await this.scanLocalFilesRecursive(
            path.join(dirPath, entry.name),
            path.join(relativePrefix, entry.name),
            localFiles
          );
        }
      }
    } catch (error) {
      // Directory doesn't exist - skip
    }
  }

  /**
   * Check if a file should be excluded from scanning
   */
  private shouldExcludeFile(filename: string): boolean {
    const excludePatterns = ['.DS_Store', '*.log', '.k0ntext-manifest.json'];
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        return regex.test(filename);
      }
      return filename === pattern;
    });
  }

  /**
   * Build comparison results
   *
   * @param templateFiles - Files from templates/base/.claude/
   * @param localFiles - Files from local .claude/
   * @param manifest - Template manifest
   * @param templateBasePath - Template base path
   * @param localBasePath - Local base path
   * @returns Array of file comparisons
   */
  private async buildComparisons(
    templateFiles: TemplateFile[],
    localFiles: Map<string, { hash: string; exists: boolean }>,
    manifest: Awaited<ReturnType<TemplateManifestManager['loadReconciledManifest']>>,
    templateBasePath: string,
    localBasePath: string
  ): Promise<FileComparison[]> {
    const comparisons: FileComparison[] = [];

    // Process template files
    for (const templateFile of templateFiles) {
      const localInfo = localFiles.get(templateFile.relativePath);
      const manifestEntry = manifest?.files[templateFile.relativePath];

      const comparison = await this.compareFile(
        templateFile,
        localInfo?.hash,
        localInfo?.exists ?? false,
        manifestEntry
      );

      comparisons.push(comparison);
    }

    // Find user-only files (exist locally but not in template)
    for (const [relativePath, localInfo] of localFiles.entries()) {
      const isInTemplate = templateFiles.some(f => f.relativePath === relativePath);
      if (!isInTemplate && localInfo.exists) {
        // User-only file
        comparisons.push({
          path: relativePath,
          state: 'user-only',
          templateHash: '',
          localHash: localInfo.hash,
          userModified: false
        });
      }
    }

    return comparisons;
  }

  /**
   * Compare a single file
   *
   * @param templateFile - Template file metadata
   * @param localHash - Local file hash (if exists)
   * @param localExists - Whether local file exists
   * @param manifestEntry - Manifest entry (if any)
   * @returns File comparison
   */
  private async compareFile(
    templateFile: TemplateFile,
    localHash: string | undefined,
    localExists: boolean,
    manifestEntry: TemplateFileEntry | null | undefined
  ): Promise<FileComparison> {
    const templateHash = templateFile.hash;
    const manifestUserModified = manifestEntry?.userModified ?? false;
    const originalHash = manifestEntry?.originalHash;

    // Determine state
    let state: FileState;
    let userModified = manifestUserModified;

    if (!localExists) {
      // File exists in template but not locally
      state = 'new';
    } else if (!localHash) {
      // Shouldn't happen, but handle gracefully
      state = 'new';
    } else if (localHash === templateHash) {
      // Files are identical
      state = 'identical';
    } else if (manifestEntry && localHash === manifestEntry.hash) {
      // File matches manifest (not user-modified), but template changed
      state = 'safe-update';
    } else {
      // File hash doesn't match template
      // Check if this is a user modification
      if (manifestUserModified) {
        // Already marked as user-modified in manifest
        state = 'conflict';
      } else if (manifestEntry && localHash !== manifestEntry.hash) {
        // File differs from manifest - user modified it after sync
        state = 'conflict';
        userModified = true; // Detect and flag user modification
      } else if (!manifestEntry) {
        // No manifest entry, file was modified before tracking started
        state = 'conflict';
      } else {
        // File hash doesn't match template or manifest
        state = 'conflict';
      }
    }

    return {
      path: templateFile.relativePath,
      state,
      templateHash,
      localHash: localHash ?? '',
      userModified,
      originalHash
    };
  }

  /**
   * Count comparisons by state
   *
   * @param comparisons - Array of comparisons
   * @returns Record of state to count
   */
  private countByState(comparisons: FileComparison[]): Record<FileState, number> {
    const counts = {
      identical: 0,
      'safe-update': 0,
      conflict: 0,
      new: 0,
      deleted: 0,
      'user-only': 0
    };

    for (const comparison of comparisons) {
      counts[comparison.state]++;
    }

    return counts;
  }

  /**
   * Filter comparisons by state
   *
   * @param comparisons - Array of comparisons
   * @param states - States to include
   * @returns Filtered comparisons
   */
  static filterByState(comparisons: FileComparison[], states: FileState[]): FileComparison[] {
    return comparisons.filter(c => states.includes(c.state));
  }

  /**
   * Get comparisons needing action
   *
   * @param comparisons - Array of comparisons
   * @returns Comparisons that need user action or update
   */
  static getActionableComparisons(comparisons: FileComparison[]): FileComparison[] {
    return TemplateComparator.filterByState(comparisons, [
      'safe-update',
      'conflict',
      'new'
    ]);
  }

  /**
   * Get comparisons with conflicts
   *
   * @param comparisons - Array of comparisons
   * @returns Comparisons with conflicts
   */
  static getConflicts(comparisons: FileComparison[]): FileComparison[] {
    return TemplateComparator.filterByState(comparisons, ['conflict']);
  }

  /**
   * Get safe updates
   *
   * @param comparisons - Array of comparisons
   * @returns Comparisons that can be safely updated
   */
  static getSafeUpdates(comparisons: FileComparison[]): FileComparison[] {
    return TemplateComparator.filterByState(comparisons, ['safe-update', 'new']);
  }

  /**
   * Format comparison for display
   *
   * @param comparison - File comparison
   * @returns Formatted string
   */
  static formatComparison(comparison: FileComparison): string {
    const stateIcon: Record<FileState, string> = {
      identical: '✓',
      'safe-update': '→',
      conflict: '⚠',
      new: '+',
      deleted: '-',
      'user-only': '👤'
    };

    const icon = stateIcon[comparison.state];
    const userFlag = comparison.userModified ? ' [modified]' : '';

    return `${icon} ${comparison.path}${userFlag}`;
  }

  /**
   * Generate summary text for comparison results
   *
   * @param result - Comparison result
   * @returns Formatted summary
   */
  static generateSummary(result: ComparisonResult): string {
    const lines: string[] = [];

    lines.push(`Template Comparison Summary:`);
    lines.push(`  Total files: ${result.total}`);
    lines.push(`  Identical: ${result.counts.identical}`);
    lines.push(`  Safe updates: ${result.counts['safe-update']}`);
    lines.push(`  New files: ${result.counts.new}`);
    lines.push(`  Conflicts: ${result.counts.conflict}`);
    lines.push(`  User-only: ${result.counts['user-only']}`);
    lines.push(`  Duration: ${result.durationMs}ms`);

    return lines.join('\n');
  }
}
