/**
 * Version Prompt
 *
 * Interactive prompts for version checking and regeneration.
 */

import chalk from 'chalk';
import { confirm, select, checkbox } from '@inquirer/prompts';
import type {
  VersionCheckResult,
  RegenerationPromptResult,
  RegenerationChoice
} from './types.js';
import { formatUpdateType } from './comparator.js';

/**
 * Show a formatted summary of version check results
 *
 * @param result - Version check result
 */
export function showVersionSummary(result: VersionCheckResult): void {
  console.log('');
  console.log(chalk.bold('Context File Version Check'));
  console.log(chalk.dim('─'.repeat(50)));

  if (result.outdated.length === 0 && result.noVersion.length === 0) {
    console.log(chalk.green('✓ All context files are up to date!'));
    console.log(chalk.dim(`Current version: ${result.currentVersion}`));
    return;
  }

  // Show outdated files
  if (result.outdated.length > 0) {
    console.log('');
    console.log(chalk.yellow(`⚠ ${result.outdated.length} file(s) need updates:`));
    console.log('');

    // Table header
    console.log(
      chalk.dim('Tool'.padEnd(12)) +
      chalk.dim('File'.padEnd(30)) +
      chalk.dim('Version')
    );
    console.log(chalk.dim('─'.repeat(54)));

    for (const file of result.outdated) {
      const toolCol = chalk.cyan(file.tool.padEnd(12));
      const fileCol = file.filePath.padEnd(30);
      const versionCol = formatUpdateType(
        file.updateType,
        file.fileVersion,
        file.currentVersion
      );

      console.log(toolCol + fileCol + versionCol);

      if (file.userModified) {
        console.log(
          chalk.dim(' '.repeat(12)) +
          chalk.yellow('⚠ Has custom modifications')
        );
      }
    }
  }

  // Show files without version markers
  if (result.noVersion.length > 0) {
    console.log('');
    console.log(chalk.dim(`ℹ ${result.noVersion.length} file(s) without version markers:`));
    for (const file of result.noVersion) {
      console.log(chalk.dim(`  ${file.filePath}`));
    }
  }

  console.log('');
}

/**
 * Prompt user for regeneration choice
 *
 * @param outdated - List of outdated files
 * @returns User's regeneration choice
 */
export async function promptRegeneration(
  outdated: NonNullable<VersionCheckResult['outdated']>
): Promise<RegenerationPromptResult> {
  if (outdated.length === 0) {
    return {
      choice: 'skip',
      includeModified: false
    };
  }

  const hasModified = outdated.some(f => f.userModified);

  // First prompt: what to update
  const choice = await select<RegenerationChoice>({
    message: 'Some context files are outdated. What would you like to do?',
    choices: [
      {
        name: 'Update all files',
        value: 'all',
        description: 'Regenerate all outdated files'
      },
      {
        name: 'Select specific files',
        value: 'select',
        description: 'Choose which files to update'
      },
      {
        name: 'Skip for now',
        value: 'skip',
        description: 'Continue without updating'
      }
    ]
  });

  if (choice === 'skip') {
    return {
      choice: 'skip',
      includeModified: false
    };
  }

  // If there are modified files, ask about them
  let includeModified = false;
  if (hasModified) {
    includeModified = await confirm({
      message: chalk.yellow('⚠ Some files have your custom modifications. Include them?'),
      default: false
    });

    if (!includeModified) {
      console.log(chalk.dim('ℹ Modified files will be skipped.'));
    }
  }

  // If user wants to select specific files
  if (choice === 'select') {
    const choices = outdated.map(f => {
      const label = `${f.tool} (${f.fileVersion} → ${f.currentVersion})`;
      const disabled = f.userModified && !includeModified
        ? 'Has custom modifications'
        : undefined;

      return {
        name: label,
        value: `${f.tool}:${f.filePath}`,
        disabled
      };
    });

    const selected = await checkbox({
      message: 'Select files to update:',
      choices
    });

    // Extract tool names from selections
    const selectedTools = selected.map(s => (s as string).split(':')[0]);

    return {
      choice: 'select',
      selectedTools,
      includeModified
    };
  }

  return {
    choice,
    includeModified
  };
}

/**
 * Show a simple prompt to update outdated files
 *
 * @param result - Version check result
 * @returns True if user wants to update
 */
export async function promptToUpdate(result: VersionCheckResult): Promise<boolean> {
  if (result.outdated.length === 0) {
    return false;
  }

  const answer = await confirm({
    message: `Update ${result.outdated.length} outdated context file(s)?`,
    default: true
  });

  return answer;
}

/**
 * Format a single file status for display
 *
 * @param status - File version status
 * @returns Formatted string
 */
export function formatFileStatus(status: {
  tool: string;
  filePath: string;
  fileVersion: string | null;
  currentVersion: string;
  updateType?: string;
}): string {
  const version = status.fileVersion || 'unknown';
  return `${status.tool}: ${version} → ${status.currentVersion}`;
}
