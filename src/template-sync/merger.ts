/**
 * Template Merger
 *
 * Auto-merge strategies for template updates.
 * Handles safe updates, new file creation, and diff generation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { FileComparison, MergeResult, MergeMethod } from './types.js';

/**
 * Merger options
 */
export interface MergerOptions {
  /** Whether to create backups before overwriting */
  createBackups?: boolean;
  /** Backup directory path */
  backupDir?: string;
  /** Whether to generate diffs */
  generateDiffs?: boolean;
  /** Number of context lines for diffs */
  diffContext?: number;
}

/**
 * Auto-merge strategies for template updates
 */
export class TemplateMerger {
  constructor(
    private projectRoot: string = process.cwd(),
    private templateRoot: string,
    private options: MergerOptions = {}
  ) {
    // Default options
    this.options = {
      createBackups: true,
      generateDiffs: true,
      diffContext: 3,
      ...options
    };
  }

  /**
   * Process multiple files for merging
   *
   * @param comparisons - File comparisons to process
   * @returns Array of merge results
   */
  async mergeFiles(comparisons: FileComparison[]): Promise<MergeResult[]> {
    const results: MergeResult[] = [];

    for (const comparison of comparisons) {
      const result = await this.mergeFile(comparison);
      results.push(result);
    }

    return results;
  }

  /**
   * Merge a single file based on comparison state
   *
   * @param comparison - File comparison
   * @returns Merge result
   */
  async mergeFile(comparison: FileComparison): Promise<MergeResult> {
    const templatePath = path.join(this.templateRoot, comparison.path);
    const localPath = path.join(this.projectRoot, '.claude', comparison.path);

    try {
      switch (comparison.state) {
        case 'new':
          return await this.createNewFile(templatePath, localPath, comparison);

        case 'safe-update':
          return await this.safeUpdate(templatePath, localPath, comparison);

        case 'identical':
          return {
            path: comparison.path,
            success: true,
            method: 'auto-safe'
          };

        case 'conflict':
          return {
            path: comparison.path,
            success: false,
            method: 'conflict',
            diff: this.options.generateDiffs ? await this.generateDiff(localPath, templatePath) : undefined
          };

        case 'deleted':
        case 'user-only':
          return {
            path: comparison.path,
            success: false,
            method: 'skip',
            error: `File state '${comparison.state}' cannot be auto-merged`
          };

        default:
          return {
            path: comparison.path,
            success: false,
            method: 'skip',
            error: `Unknown state: ${(comparison as any).state}`
          };
      }
    } catch (error) {
      return {
        path: comparison.path,
        success: false,
        method: 'skip',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create new file (no local version exists)
   *
   * @param templatePath - Path to template file
   * @param localPath - Path where local file should be created
   * @param comparison - File comparison
   * @returns Merge result
   */
  private async createNewFile(
    templatePath: string,
    localPath: string,
    comparison: FileComparison
  ): Promise<MergeResult> {
    try {
      // Read template content
      const content = await fs.readFile(templatePath, 'utf8');

      // Create directory if needed
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      // Write file
      await fs.writeFile(localPath, content, 'utf8');

      return {
        path: comparison.path,
        success: true,
        method: 'auto-create'
      };
    } catch (error) {
      return {
        path: comparison.path,
        success: false,
        method: 'skip',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Safe update (local exists but not user-modified)
   *
   * @param templatePath - Path to template file
   * @param localPath - Path to local file
   * @param comparison - File comparison
   * @returns Merge result
   */
  private async safeUpdate(
    templatePath: string,
    localPath: string,
    comparison: FileComparison
  ): Promise<MergeResult> {
    try {
      // Read template content
      const content = await fs.readFile(templatePath, 'utf8');

      // Generate diff before updating
      const diff = this.options.generateDiffs
        ? await this.generateDiff(localPath, templatePath)
        : undefined;

      // Create backup if enabled
      if (this.options.createBackups) {
        await this.createBackup(localPath);
      }

      // Write file
      await fs.writeFile(localPath, content, 'utf8');

      return {
        path: comparison.path,
        success: true,
        method: 'auto-safe',
        diff
      };
    } catch (error) {
      return {
        path: comparison.path,
        success: false,
        method: 'skip',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Overwrite file with template (for conflict resolution)
   *
   * @param templatePath - Path to template file
   * @param localPath - Path to local file
   * @returns Merge result
   */
  async overwriteFile(templatePath: string, localPath: string): Promise<MergeResult> {
    try {
      // Read template content
      const content = await fs.readFile(templatePath, 'utf8');

      // Create backup if enabled
      if (this.options.createBackups) {
        await this.createBackup(localPath);
      }

      // Write file
      await fs.writeFile(localPath, content, 'utf8');

      return {
        path: path.relative(this.projectRoot, localPath),
        success: true,
        method: 'overwrite'
      };
    } catch (error) {
      return {
        path: path.relative(this.projectRoot, localPath),
        success: false,
        method: 'skip',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create backup of a file
   *
   * @param filePath - Path to file to backup
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupDir = this.options.backupDir ?? path.join(this.projectRoot, '.k0ntext', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      backupDir,
      `${path.basename(filePath)}.${timestamp}.bak`
    );

    await fs.copyFile(filePath, backupPath);
  }

  /**
   * Generate unified diff between two files
   *
   * @param localPath - Path to local file
   * @param templatePath - Path to template file
   * @returns Unified diff string
   */
  async generateDiff(localPath: string, templatePath: string): Promise<string> {
    try {
      const localContent = await this.readFileSafe(localPath);
      const templateContent = await this.readFileSafe(templatePath);

      const localLines = localContent.split('\n');
      const templateLines = templateContent.split('\n');

      return this.unifiedDiff(localLines, templateLines, localPath, templatePath);
    } catch {
      return '(diff unavailable)';
    }
  }

  /**
   * Read file safely, return empty string if not found
   *
   * @param filePath - Path to file
   * @returns File content
   */
  private async readFileSafe(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  /**
   * Generate unified diff (simplified implementation)
   *
   * @param localLines - Local file lines
   * @param templateLines - Template file lines
   * @param localPath - Local file path (for header)
   * @param templatePath - Template file path (for header)
   * @returns Unified diff string
   */
  private unifiedDiff(
    localLines: string[],
    templateLines: string[],
    localPath: string,
    templatePath: string
  ): string {
    const context = this.options.diffContext ?? 3;
    const lines: string[] = [];

    // Simple diff header
    lines.push(`--- ${path.basename(localPath)}`);
    lines.push(`+++ ${path.basename(templatePath)}`);

    // Find differences
    let i = 0;
    let j = 0;

    while (i < localLines.length || j < templateLines.length) {
      if (i < localLines.length && j < templateLines.length) {
        if (localLines[i] === templateLines[j]) {
          // Context line (show only first few around changes)
          if (this.shouldShowContext(i, localLines, templateLines)) {
            lines.push(` ${localLines[i]}`);
          }
          i++;
          j++;
        } else {
          // Difference found - show context
          this.showContext(lines, localLines, templateLines, i, j, context);

          // Show changes
          const localEnd = this.findChangeEnd(localLines, i, templateLines[j]);
          const templateEnd = this.findChangeEnd(templateLines, j, localLines[i]);

          for (let k = i; k < localEnd; k++) {
            lines.push(`-${localLines[k]}`);
          }
          for (let k = j; k < templateEnd; k++) {
            lines.push(`+${templateLines[k]}`);
          }

          i = localEnd;
          j = templateEnd;
        }
      } else if (i < localLines.length) {
        // Remaining lines in local (deletions)
        lines.push(`-${localLines[i]}`);
        i++;
      } else {
        // Remaining lines in template (additions)
        lines.push(`+${templateLines[j]}`);
        j++;
      }
    }

    return lines.join('\n');
  }

  /**
   * Check if context should be shown
   */
  private shouldShowContext(
    i: number,
    localLines: string[],
    templateLines: string[]
  ): boolean {
    // Show context if we're near a change or at the start/end
    const context = this.options.diffContext ?? 3;

    // Check if there's a change nearby
    for (let offset = 1; offset <= context; offset++) {
      if (i + offset < localLines.length && i + offset < templateLines.length) {
        if (localLines[i + offset] !== templateLines[i + offset]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Show context lines before a change
   */
  private showContext(
    lines: string[],
    localLines: string[],
    templateLines: string[],
    i: number,
    j: number,
    context: number
  ): void {
    const start = Math.max(0, i - context);

    // Show context lines if not already shown
    for (let k = start; k < i; k++) {
      if (localLines[k] === templateLines[k]) {
        const lastLine = lines[lines.length - 1];
        if (!lastLine || lastLine[0] !== ' ') {
          lines.push(` ${localLines[k]}`);
        }
      }
    }
  }

  /**
   * Find end of a change block
   */
  private findChangeEnd(lines: string[], start: number, otherValue: string): number {
    let end = start + 1;
    while (end < lines.length && lines[end] !== otherValue) {
      end++;
    }
    return end;
  }

  /**
   * Get merge statistics from results
   *
   * @param results - Array of merge results
   * @returns Statistics
   */
  static getStatistics(results: MergeResult[]): {
    total: number;
    successful: number;
    failed: number;
    byMethod: Record<MergeMethod, number>;
  } {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      byMethod: {
        'auto-safe': 0,
        'auto-create': 0,
        overwrite: 0,
        skip: 0,
        conflict: 0
      }
    };

    for (const result of results) {
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
      stats.byMethod[result.method]++;
    }

    return stats;
  }
}
