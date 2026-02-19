/**
 * Restore Command
 *
 * CLI command to restore AI tool config files from backups.
 * Supports listing backups and restoring from specific backups.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { select, confirm } from '@inquirer/prompts';
import type { DatabaseClient } from '../../db/client.js';

/**
 * Parse git stash reference from backup path
 */
function parseGitStashRef(backupPath: string): { stashRef: string } | null {
  if (backupPath.startsWith('git-stash:')) {
    return { stashRef: backupPath.replace('git-stash:', '') };
  }
  return null;
}

/**
 * Restore from git stash
 */
async function restoreFromGitStash(stashRef: string, projectRoot: string, filePath: string): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const relativePath = path.relative(projectRoot, filePath);

    // Try to apply the stash
    execSync(`git stash apply ${stashRef} -- "${relativePath}"`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Format backup info for display
 */
function formatBackupInfo(backupPath: string, tool: string): string {
  const gitStash = parseGitStashRef(backupPath);

  if (gitStash) {
    return `${chalk.cyan(tool.padEnd(12))} ${chalk.dim('Git stash:')} ${chalk.yellow(gitStash.stashRef)}`;
  }

  const fileName = path.basename(backupPath);
  const dateMatch = fileName.match(/\.(\d{4}-\d{2}-\d{2}T[\d:.-]+)\.bak$/);

  if (dateMatch) {
    const date = new Date(dateMatch[1].replace(/-/g, ':'));
    const formatted = date.toLocaleString();
    return `${chalk.cyan(tool.padEnd(12))} ${chalk.dim('File:')} ${chalk.yellow(fileName)} ${chalk.dim(`(${formatted})`)}`;
  }

  return `${chalk.cyan(tool.padEnd(12))} ${chalk.yellow(backupPath)}`;
}

/**
 * List available backups for a tool
 */
async function listBackupsForTool(
  db: DatabaseClient,
  projectRoot: string,
  tool: string
): Promise<Array<{ tool: string; backupPath: string; filePath: string; generatedAt?: string }>> {
  const generatedFiles = db.getGeneratedFiles(tool);

  return generatedFiles
    .filter(f => f.backupPath)
    .map(f => ({
      tool,
      backupPath: f.backupPath!,
      filePath: f.filePath,
      generatedAt: f.generatedAt
    }));
}

/**
 * Restore command
 */
export const restoreCommand = new Command('restore')
  .description('Restore AI tool config files from backups')
  .option('--list', 'List available backups')
  .option('--backup <path>', 'Restore from specific backup path')
  .option('--tool <name>', 'Filter by tool name')
  .option('--force', 'Restore without confirmation')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);

      // List mode
      if (options.list) {
        spinner.start('Finding backups...');

        const tools = options.tool
          ? [options.tool]
          : ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'];

        const allBackups: Array<{ tool: string; backupPath: string; filePath: string }> = [];

        for (const tool of tools) {
          const backups = await listBackupsForTool(db, projectRoot, tool);
          allBackups.push(...backups);
        }

        spinner.stop();

        if (allBackups.length === 0) {
          console.log(chalk.yellow('\nNo backups found.'));
          console.log(chalk.dim('Generate context files first to create backups.\n'));
          return;
        }

        console.log(chalk.bold('\nAvailable Backups'));
        console.log(chalk.dim('─'.repeat(60)));

        for (const backup of allBackups) {
          console.log(formatBackupInfo(backup.backupPath, backup.tool));
          console.log(chalk.dim(`  Target: ${backup.filePath}\n`));
        }

        console.log(chalk.dim(`Run ${chalk.white('k0ntext restore --backup <path>')} to restore from a backup.\n`));
        db.close();
        return;
      }

      // Restore from specific backup
      if (options.backup) {
        const backupPath = options.backup;
        const targetPath = await findTargetForBackup(db, backupPath, options.tool);

        if (!targetPath) {
          spinner.fail(chalk.red('Backup not found in database'));
          console.log(chalk.dim('\nUse --list to see available backups.\n'));
          db.close();
          return;
        }

        // Confirm unless --force
        if (!options.force) {
          const confirmed = await confirm({
            message: `Restore ${targetPath.filePath} from backup?`,
            default: false
          });

          if (!confirmed) {
            console.log(chalk.dim('\nRestore cancelled.\n'));
            db.close();
            return;
          }
        }

        spinner.start('Restoring from backup...');

        const success = await restoreFromBackup(backupPath, targetPath.filePath, projectRoot);

        if (success) {
          spinner.succeed(chalk.green('File restored successfully!'));

          // Clear the user_modified flag since we restored the generated version
          const tool = targetPath.tool;
          db.upsertGeneratedFile({
            tool,
            filePath: targetPath.filePath,
            contentHash: db.hashContent(await fs.readFile(targetPath.filePath, 'utf-8')),
            backupPath: undefined // Clear backup after restore
          });
        } else {
          spinner.fail(chalk.red('Restore failed'));
        }

        db.close();
        return;
      }

      // Interactive mode
      spinner.start('Loading backups...');

      const tools = ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'];
      const allBackups: Array<{ tool: string; backupPath: string; filePath: string; label: string }> = [];

      for (const tool of tools) {
        const backups = await listBackupsForTool(db, projectRoot, tool);
        for (const backup of backups) {
          allBackups.push({
            ...backup,
            label: `${tool}: ${path.basename(backup.filePath)} (${backup.backupPath.split(':').pop()})`
          });
        }
      }

      spinner.stop();

      if (allBackups.length === 0) {
        console.log(chalk.yellow('\nNo backups found.'));
        console.log(chalk.dim('Generate context files first to create backups.\n'));
        db.close();
        return;
      }

      // Prompt user to select backup
      const selected = await select({
        message: 'Select a backup to restore:',
        choices: [
          ...allBackups.map(b => ({
            name: b.label,
            value: b
          })),
          { name: 'Cancel', value: null }
        ]
      });

      if (!selected) {
        console.log(chalk.dim('\nRestore cancelled.\n'));
        db.close();
        return;
      }

      // Confirm restore
      const confirmed = await confirm({
        message: `Restore ${selected.filePath} from backup?`,
        default: true
      });

      if (!confirmed) {
        console.log(chalk.dim('\nRestore cancelled.\n'));
        db.close();
        return;
      }

      spinner.start('Restoring from backup...');

      const success = await restoreFromBackup(selected.backupPath, selected.filePath, projectRoot);

      if (success) {
        spinner.succeed(chalk.green('File restored successfully!'));

        // Clear the user_modified flag
        const content = await fs.readFile(selected.filePath, 'utf-8');
        db.upsertGeneratedFile({
          tool: selected.tool,
          filePath: selected.filePath,
          contentHash: db.hashContent(content),
          backupPath: undefined
        });
      } else {
        spinner.fail(chalk.red('Restore failed'));
      }

      db.close();

    } catch (error) {
      spinner.fail('Restore failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Find the target file path for a backup
 */
async function findTargetForBackup(
  db: DatabaseClient,
  backupPath: string,
  toolFilter?: string
): Promise<{ tool: string; filePath: string } | null> {
  const tools = toolFilter
    ? [toolFilter]
    : ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'];

  for (const tool of tools) {
    const files = db.getGeneratedFiles(tool);
    for (const file of files) {
      if (file.backupPath === backupPath) {
        return { tool, filePath: file.filePath };
      }
    }
  }

  return null;
}

/**
 * Restore from a backup (file or git stash)
 */
async function restoreFromBackup(backupPath: string, targetPath: string, projectRoot: string): Promise<boolean> {
  const gitStash = parseGitStashRef(backupPath);

  if (gitStash) {
    return await restoreFromGitStash(gitStash.stashRef, projectRoot, targetPath);
  }

  // File copy restore
  try {
    await fs.copyFile(backupPath, targetPath);
    return true;
  } catch {
    return false;
  }
}
