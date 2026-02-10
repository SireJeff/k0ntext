/**
 * Template Scanner
 *
 * Scans template directories for files to sync.
 * Recursively discovers files while respecting exclude patterns.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { TemplateFile, TemplateSubdir } from './types.js';
import { TEMPLATE_SUBDIRS, EXCLUDED_SUBDIRS } from './types.js';
import { TemplateHasher } from './hasher.js';

/**
 * Scan result with metadata
 */
export interface ScanResult {
  /** Files found */
  files: TemplateFile[];
  /** Subdirectories scanned */
  subdirectories: TemplateSubdir[];
  /** Files skipped due to exclude patterns */
  skipped: string[];
  /** Scan duration in milliseconds */
  durationMs: number;
}

/**
 * Default exclude patterns for directory scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  '*.log',
  '.k0ntext-manifest.json'
];

/**
 * Scans template directories for files
 */
export class TemplateScanner {
  /**
   * Scan a directory for template files recursively
   *
   * @param rootPath - Root directory to scan (e.g., templates/base/.claude/)
   * @param subdirectories - Subdirectories to include
   * @param excludePatterns - Patterns to exclude
   * @returns Array of template files found
   */
  static async scanDirectory(
    rootPath: string,
    subdirectories: TemplateSubdir[] = TEMPLATE_SUBDIRS,
    excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS
  ): Promise<TemplateFile[]> {
    const results: TemplateFile[] = [];

    for (const subdir of subdirectories) {
      const dirPath = path.join(rootPath, subdir);
      const files = await this.scanRecursive(dirPath, rootPath, excludePatterns);
      results.push(...files);
    }

    return results;
  }

  /**
   * Scan with detailed result metadata
   *
   * @param rootPath - Root directory to scan
   * @param subdirectories - Subdirectories to include
   * @param excludePatterns - Patterns to exclude
   * @returns Detailed scan result
   */
  static async scan(
    rootPath: string,
    subdirectories: TemplateSubdir[] = TEMPLATE_SUBDIRS,
    excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const skipped: string[] = [];

    const files = await this.scanDirectory(rootPath, subdirectories, excludePatterns);

    return {
      files,
      subdirectories,
      skipped,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Recursively scan directory
   *
   * @param dirPath - Current directory path
   * @param basePath - Base path for relative path calculation
   * @param excludePatterns - Patterns to exclude
   * @returns Array of template files found
   */
  private static async scanRecursive(
    dirPath: string,
    basePath: string,
    excludePatterns: string[]
  ): Promise<TemplateFile[]> {
    const results: TemplateFile[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip excluded patterns
        if (this.shouldExclude(entry.name, excludePatterns)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subdirResults = await this.scanRecursive(fullPath, basePath, excludePatterns);
          results.push(...subdirResults);
        } else if (entry.isFile()) {
          // Get file stats
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(basePath, fullPath).split(path.sep).join('/');

          results.push({
            relativePath,
            hash: '', // Hashed later to avoid double work
            size: stats.size,
            mtime: stats.mtime
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist or cannot be read - skip silently
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Log non-ENOINT errors but don't fail
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Check if a file/directory should be excluded
   *
   * @param name - File or directory name
   * @param excludePatterns - Patterns to check against
   * @returns true if should be excluded
   */
  private static shouldExclude(name: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Glob pattern
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );
        return regex.test(name);
      }
      return name === pattern || name.includes(pattern);
    });
  }

  /**
   * Get all template subdirectories to sync
   */
  static getSyncedSubdirs(): TemplateSubdir[] {
    return [...TEMPLATE_SUBDIRS];
  }

  /**
   * Get excluded subdirectories
   */
  static getExcludedSubdirs(): string[] {
    return [...EXCLUDED_SUBDIRS];
  }

  /**
   * Check if a subdirectory should be synced
   *
   * @param subdir - Subdirectory name
   * @returns true if subdirectory should be synced
   */
  static isSyncedSubdir(subdir: string): subdir is TemplateSubdir {
    return TEMPLATE_SUBDIRS.includes(subdir as TemplateSubdir);
  }

  /**
   * Check if a subdirectory should be excluded
   *
   * @param subdir - Subdirectory name
   * @returns true if subdirectory should be excluded
   */
  static isExcludedSubdir(subdir: string): boolean {
    return EXCLUDED_SUBDIRS.includes(subdir as any);
  }

  /**
   * Scan and hash files in one pass
   *
   * @param rootPath - Root directory to scan
   * @param subdirectories - Subdirectories to include
   * @returns Array of template files with hashes
   */
  static async scanAndHash(
    rootPath: string,
    subdirectories?: TemplateSubdir[]
  ): Promise<TemplateFile[]> {
    // Use scan() to get files, then hash them
    const result = await this.scan(rootPath, subdirectories);

    // Hash files in parallel
    const hashedFiles = await Promise.all(
      result.files.map(async (file) => {
        const fullPath = path.join(rootPath, file.relativePath);
        const hash = await TemplateHasher.hashFileSafe(fullPath);
        return { ...file, hash };
      })
    );

    return hashedFiles;
  }

  /**
   * Get file count by subdirectory
   *
   * @param files - Array of template files
   * @returns Map of subdirectory to file count
   */
  static getFileCountBySubdir(files: TemplateFile[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const file of files) {
      const subdir = file.relativePath.split(path.sep)[0];
      counts.set(subdir, (counts.get(subdir) ?? 0) + 1);
    }

    return counts;
  }

  /**
   * Filter files by subdirectory
   *
   * @param files - Array of template files
   * @param subdir - Subdirectory to filter by
   * @returns Filtered array of files
   */
  static filterBySubdir(files: TemplateFile[], subdir: string): TemplateFile[] {
    return files.filter(file => file.relativePath.startsWith(subdir + path.sep));
  }
}
