/**
 * Conflict Resolver
 *
 * Handles interactive conflict resolution for template sync.
 * Uses @inquirer/prompts for user interaction.
 */

import chalk from 'chalk';
import { confirm, select, checkbox } from '@inquirer/prompts';
import type { FileComparison, ResolutionChoice, ResolutionResult } from './types.js';
import { TemplateMerger } from './merger.js';

/**
 * Resolution options for a single conflict
 */
export interface ResolutionOptions {
  /** Whether to show diffs by default */
  showDiff?: boolean;
  /** Whether to allow batch resolution */
  allowBatch?: boolean;
  /** Default choice */
  defaultChoice?: ResolutionChoice;
}

/**
 * Batch resolution strategy
 */
export type BatchStrategy = 'keep-all' | 'overwrite-all' | 'individual';

/**
 * Handles interactive conflict resolution
 */
export class ConflictResolver {
  constructor(
    private projectRoot: string = process.cwd(),
    private templateRoot: string
  ) {}

  /**
   * Resolve conflicts interactively
   *
   * @param conflicts - Array of conflicting comparisons
   * @param options - Resolution options
   * @returns Array of resolution results
   */
  async resolveConflicts(
    conflicts: FileComparison[],
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult[]> {
    if (conflicts.length === 0) {
      return [];
    }

    const results: ResolutionResult[] = [];
    const allowBatch = options.allowBatch !== false;

    // Show summary
    this.showConflictSummary(conflicts);

    // Ask for batch vs individual resolution
    if (allowBatch && conflicts.length > 1) {
      const strategy = await this.promptBatchStrategy(conflicts.length);

      if (strategy === 'keep-all') {
        // Keep all local versions
        for (const conflict of conflicts) {
          results.push({ path: conflict.path, choice: 'keep-local' });
        }
        return results;
      } else if (strategy === 'overwrite-all') {
        // Overwrite all with templates
        for (const conflict of conflicts) {
          results.push({ path: conflict.path, choice: 'overwrite' });
        }
        return results;
      }
      // Otherwise, continue to individual resolution
    }

    // Individual resolution
    for (const conflict of conflicts) {
      const result = await this.resolveConflict(conflict, options);
      results.push(result);

      // Exit if user cancels
      if (result.choice === 'skip') {
        break;
      }
    }

    return results;
  }

  /**
   * Resolve a single conflict
   *
   * @param conflict - File comparison in conflict
   * @param options - Resolution options
   * @returns Resolution result
   */
  async resolveConflict(
    conflict: FileComparison,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    // Show file info
    this.showConflictInfo(conflict);

    // Ask for resolution
    const choice = await this.promptResolution(conflict, options);

    if (choice === 'show-diff') {
      // Show diff and re-prompt
      await this.showDiff(conflict);
      return await this.resolveConflict(conflict, options);
    }

    return {
      path: conflict.path,
      choice
    };
  }

  /**
   * Prompt for batch resolution strategy
   *
   * @param count - Number of conflicts
   * @returns Batch strategy
   */
  private async promptBatchStrategy(count: number): Promise<BatchStrategy> {
    return await select({
      message: `Resolve ${count} conflicts:`,
      choices: [
        {
          name: 'Keep all local versions',
          value: 'keep-all',
          description: 'Skip updating all conflicted files'
        },
        {
          name: 'Overwrite all with templates',
          value: 'overwrite-all',
          description: 'Replace all local files with template versions (backups created)'
        },
        {
          name: 'Resolve individually',
          value: 'individual',
          description: 'Review and resolve each conflict separately'
        }
      ]
    });
  }

  /**
   * Prompt for resolution of a single conflict
   *
   * @param conflict - File comparison
   * @param options - Resolution options
   * @returns Resolution choice
   */
  private async promptResolution(
    conflict: FileComparison,
    options: ResolutionOptions
  ): Promise<ResolutionChoice> {
    const baseChoices = [
      {
        name: 'Show diff',
        value: 'show-diff' as const,
        description: 'View differences before deciding'
      },
      {
        name: 'Keep local version',
        value: 'keep-local' as const,
        description: 'Skip updating this file (preserves your changes)'
      },
      {
        name: 'Overwrite with template',
        value: 'overwrite' as const,
        description: 'Replace local file with template version (backup created)'
      }
    ];

    const skipChoice = {
      name: 'Skip for now',
      value: 'skip' as const,
      description: 'Leave unchanged and continue to next file'
    };

    const choices = options.defaultChoice !== 'skip'
      ? [...baseChoices, skipChoice]
      : baseChoices;

    return await select<ResolutionChoice>({
      message: 'How would you like to resolve this?',
      choices,
      default: options.defaultChoice ?? 'keep-local'
    });
  }

  /**
   * Show conflict information
   *
   * @param conflict - File comparison
   */
  private showConflictInfo(conflict: FileComparison): void {
    console.log('');
    console.log(chalk.cyan(`File: ${conflict.path}`));
    console.log(chalk.dim(`State: ${this.formatState(conflict.state)}`));

    if (conflict.userModified) {
      console.log(chalk.yellow('  ⚠ You have modified this file'));
    }

    // Show file info if hashes differ
    if (conflict.templateHash !== conflict.localHash) {
      console.log(chalk.dim(`  Template hash: ${conflict.templateHash}`));
      console.log(chalk.dim(`  Local hash: ${conflict.localHash}`));
    }
  }

  /**
   * Show conflict summary
   *
   * @param conflicts - Array of conflicts
   */
  private showConflictSummary(conflicts: FileComparison[]): void {
    console.log('');
    console.log(chalk.yellow(`⚠ ${conflicts.length} conflict(s) detected:\n`));

    for (const conflict of conflicts) {
      const icon = conflict.userModified ? '⚠' : '→';
      const userFlag = conflict.userModified ? ' [modified]' : '';
      console.log(chalk.dim(`  ${icon} ${conflict.path}${userFlag}`));
    }

    console.log('');
  }

  /**
   * Show diff for a conflict
   *
   * @param conflict - File comparison
   */
  private async showDiff(conflict: FileComparison): Promise<void> {
    const merger = new TemplateMerger(this.projectRoot, this.templateRoot, {
      generateDiffs: true
    });

    const templatePath = path.join(this.templateRoot, conflict.path);
    const localPath = path.join(this.projectRoot, '.claude', conflict.path);

    const diff = await merger.generateDiff(localPath, templatePath);

    console.log('');
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.bold('Diff:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.dim(diff));
    console.log(chalk.gray('─'.repeat(60)));
    console.log('');

    // Wait for user to acknowledge
    await confirm({
      message: 'Press Enter to continue...',
      default: true
    });
  }

  /**
   * Format file state for display
   *
   * @param state - File state
   * @returns Formatted state string
   */
  private formatState(state: FileComparison['state']): string {
    const stateLabels: Record<FileComparison['state'], string> = {
      identical: 'Identical to template',
      'safe-update': 'Template updated (safe to apply)',
      conflict: 'Modified in both template and locally',
      new: 'New file in template',
      deleted: 'Removed from template',
      'user-only': 'User-only file (not in template)'
    };

    return stateLabels[state] || state;
  }

  /**
   * Apply resolution results using merger
   *
   * @param resolutions - Array of resolution results
   * @param conflicts - Original conflicts for reference
   * @returns Results of applied resolutions
   */
  async applyResolutions(
    resolutions: ResolutionResult[],
    conflicts: FileComparison[]
  ): Promise<{ applied: number; skipped: number; errors: number }> {
    let applied = 0;
    let skipped = 0;
    let errors = 0;

    const merger = new TemplateMerger(this.projectRoot, this.templateRoot);

    for (const resolution of resolutions) {
      const conflict = conflicts.find(c => c.path === resolution.path);
      if (!conflict) continue;

      if (resolution.choice === 'overwrite') {
        const templatePath = path.join(this.templateRoot, conflict.path);
        const localPath = path.join(this.projectRoot, '.claude', conflict.path);

        const result = await merger.overwriteFile(templatePath, localPath);
        if (result.success) {
          applied++;
        } else {
          errors++;
          console.error(chalk.red(`Error overwriting ${conflict.path}: ${result.error}`));
        }
      } else {
        skipped++;
      }
    }

    return { applied, skipped, errors };
  }

  /**
   * Prompt for archival of removed files
   *
   * @param removedFiles - Array of removed file paths
   * @returns true if user wants to archive
   */
  async promptArchiveRemoved(removedFiles: string[]): Promise<boolean> {
    if (removedFiles.length === 0) {
      return false;
    }

    console.log('');
    console.log(chalk.yellow(`The following ${removedFiles.length} file(s) have been removed from the template:`));
    for (const file of removedFiles.slice(0, 5)) {
      console.log(chalk.dim(`  - ${file}`));
    }
    if (removedFiles.length > 5) {
      console.log(chalk.dim(`  ... and ${removedFiles.length - 5} more`));
    }
    console.log('');

    return await confirm({
      message: 'Archive these files to .k0ntext/archive/ instead of deleting?',
      default: true
    });
  }

  /**
   * Show dry run results
   *
   * @param comparisons - File comparisons
   */
  showDryRunResults(comparisons: FileComparison[]): void {
    console.log('');
    console.log(chalk.bold('Dry Run Results:\n'));

    const byState = comparisons.reduce((acc, c) => {
      acc[c.state] = acc[c.state] ?? [];
      acc[c.state].push(c);
      return acc;
    }, {} as Record<string, FileComparison[]>);

    const stateOrder: FileComparison['state'][] = [
      'new',
      'safe-update',
      'conflict',
      'identical',
      'user-only',
      'deleted'
    ];

    for (const state of stateOrder) {
      const files = byState[state];
      if (!files || files.length === 0) continue;

      const stateLabel = this.formatState(state);
      const icon = state === 'conflict' ? '⚠' : state === 'new' ? '+' : state === 'safe-update' ? '→' : '•';

      console.log(chalk.cyan(`${icon} ${stateLabel}: ${files.length}`));

      for (const file of files.slice(0, 5)) {
        const userFlag = file.userModified ? ' [modified]' : '';
        console.log(chalk.dim(`    ${file.path}${userFlag}`));
      }

      if (files.length > 5) {
        console.log(chalk.dim(`    ... and ${files.length - 5} more`));
      }

      console.log('');
    }
  }
}

// Import path for dynamic use
import path from 'path';
