/**
 * Snapshot Commands
 *
 * CLI commands for managing database snapshots.
 * Supports create, restore, list, and diff operations.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { confirm } from '@inquirer/prompts';
import { SnapshotManager } from '../../services/snapshot-manager.js';
import type { SnapshotMetadata } from '../../services/snapshot-manager.js';

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours > 24) {
    return `${date.toLocaleDateString()} (${Math.floor(diffHours / 24)}d ago)`;
  } else if (diffHours > 0) {
    return `${date.toLocaleDateString()} (${diffHours}h ago)`;
  } else if (diffMins > 0) {
    return `${date.toLocaleDateString()} (${diffMins}m ago)`;
  } else {
    return date.toLocaleTimeString();
  }
}

/**
 * Format snapshot metadata for display
 */
function formatSnapshot(snapshot: SnapshotMetadata): string {
  const tags = snapshot.tags ? snapshot.tags.map((t: string) => chalk.cyan(`#${t}`)).join(' ') : '';
  const tagStr = tags ? ` ${tags}` : '';
  const auto = snapshot.automatic ? chalk.dim('[auto]') : '';

  return `${chalk.bold(snapshot.name)} ${auto}${tagStr}
  ${chalk.dim(`ID: ${snapshot.id}`)}
  ${chalk.dim(`Created: ${formatDate(snapshot.createdAt)}`)}
  ${chalk.dim(`Size: ${formatBytes(snapshot.size)}`)}
  ${chalk.dim(`Items: ${snapshot.itemCount}`)}
  ${snapshot.gitCommit ? chalk.dim(`Git: ${snapshot.gitCommit.substring(0, 8)}`) : ''}`;
}

/**
 * Snapshot create command
 */
export const snapshotCreateCommand = new Command('snapshot')
  .alias('snap')
  .description('Create a database snapshot')
  .option('-n, --name <name>', 'Snapshot name')
  .option('-d, --description <text>', 'Snapshot description')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--no-compress', 'Do not compress snapshot')
  .option('--dry-run', 'Show what would be saved without creating')
  .option('--no-git', 'Do not include git commit in metadata')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const { version: K0NTEXT_VERSION } = await import('../../cli/version/comparator.js');
      const db = new DatabaseClient(projectRoot);
      const manager = new SnapshotManager(db, projectRoot, K0NTEXT_VERSION);

      // Get snapshot name if not provided
      let name = options.name;
      if (!name) {
        const now = new Date();
        name = `Snapshot ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      }

      // Parse tags
      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;

      spinner.start('Creating snapshot...');

      // Create snapshot
      const metadata = await manager.createSnapshot({
        name,
        description: options.description,
        tags,
        dryRun: !!options.dryRun,
        includeGitCommit: options.git !== false,
        compress: options.noCompress !== true
      });

      spinner.stop();

      if (options.dryRun) {
        console.log(chalk.bold('\nDry run - snapshot would be created:'));
        console.log(formatSnapshot(metadata));
        console.log(chalk.dim('\nRun without --dry-run to create the snapshot.'));
      } else {
        console.log(chalk.bold('\nSnapshot created successfully!'));
        console.log(formatSnapshot(metadata));
        console.log(chalk.dim(`\nRun 'k0ntext snapshot restore ${metadata.id}' to restore.`));
      }

      db.close();

    } catch (error) {
      spinner.fail('Failed to create snapshot');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Snapshot restore command
 */
export const snapshotRestoreCommand = new Command('snapshot')
  .alias('snap-restore')
  .description('Restore a database snapshot')
  .argument('[snapshot]', 'Snapshot ID or path to restore')
  .option('-f, --force', 'Restore without confirmation')
  .option('--no-backup', 'Do not backup current database')
  .option('--no-verify', 'Skip database verification after restore')
  .action(async (snapshotId, options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const { version: K0NTEXT_VERSION } = await import('../../cli/version/comparator.js');
      const db = new DatabaseClient(projectRoot);
      const manager = new SnapshotManager(db, projectRoot, K0NTEXT_VERSION);

      // List snapshots if no ID provided
      if (!snapshotId) {
        spinner.start('Loading snapshots...');
        const snapshots = await manager.listSnapshots();
        spinner.stop();

        if (snapshots.length === 0) {
          console.log(chalk.yellow('\nNo snapshots found.'));
          console.log(chalk.dim('Run "k0ntext snapshot create" to create one.\n'));
          db.close();
          return;
        }

        console.log(chalk.bold('\nAvailable Snapshots:'));
        console.log(chalk.dim('─'.repeat(60)));

        for (const snap of snapshots.slice(0, 20)) {
          console.log(formatSnapshot({
            id: snap.id,
            name: snap.name,
            createdAt: snap.createdAt,
            size: snap.size,
            itemCount: snap.itemCount,
            k0ntextVersion: K0NTEXT_VERSION,
            automatic: false,
            tags: snap.tags
          }));
        }

        if (snapshots.length > 20) {
          console.log(chalk.dim(`\n... and ${snapshots.length - 20} more`));
          console.log(chalk.dim(`Run "k0ntext snapshot restore <id>" to restore a snapshot.`));
        }

        db.close();
        return;
      }

      // Resolve snapshot path
      let snapshotPath = snapshotId;
      if (!path.isAbsolute(snapshotId)) {
        // Try to find snapshot by ID
        const snapshots = await manager.listSnapshots();
        const found = snapshots.find(s => s.id === snapshotId);
        if (found) {
          snapshotPath = found.path;
        } else {
          spinner.fail(chalk.red(`Snapshot not found: ${snapshotId}`));
          console.log(chalk.dim('\nRun "k0ntext snapshot list" to see available snapshots.\n'));
          db.close();
          process.exit(1);
          return;
        }
      }

      // Confirm restore
      if (!options.force) {
        const confirmed = await confirm({
          message: `Restore snapshot ${snapshotId}? This will replace your current database.`,
          default: false
        });

        if (!confirmed) {
          console.log(chalk.dim('\nRestore cancelled.\n'));
          db.close();
          return;
        }
      }

      spinner.start('Restoring snapshot...');

      await manager.restoreSnapshot({
        snapshotPath,
        force: true,
        backupBeforeRestore: options.backup !== false,
        verify: options.verify !== false
      });

      spinner.succeed(chalk.green('Snapshot restored successfully!'));
      console.log(chalk.dim('\nDatabase has been restored to the selected snapshot state.'));

      db.close();

    } catch (error) {
      spinner.fail('Failed to restore snapshot');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Snapshot list command
 */
export const snapshotListCommand = new Command('snapshot')
  .alias('snapshots')
  .description('List all database snapshots')
  .option('-v, --verbose', 'Show detailed information')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);
      const manager = new SnapshotManager(db, projectRoot, 'unknown');

      spinner.start('Loading snapshots...');

      const snapshots = await manager.listSnapshots();
      const usage = await manager.getStorageUsage();

      spinner.stop();

      if (snapshots.length === 0) {
        console.log(chalk.yellow('\nNo snapshots found.'));
        console.log(chalk.dim('Run "k0ntext snapshot create" to create one.\n'));
        db.close();
        return;
      }

      // JSON output
      if (options.json) {
        console.log(JSON.stringify({
          total: snapshots.length,
          usage: {
            totalSize: formatBytes(usage.totalSize),
            oldest: usage.oldestSnapshot,
            newest: usage.newestSnapshot
          },
          snapshots: snapshots.map(s => ({
            id: s.id,
            name: s.name,
            createdAt: s.createdAt,
            size: s.size,
            itemCount: s.itemCount,
            tags: s.tags
          }))
        }, null, 2));
        db.close();
        return;
      }

      // Regular output
      console.log(chalk.bold('\nSnapshots'));
      console.log(chalk.dim('─'.repeat(60)));

      console.log(`Total: ${chalk.cyan(snapshots.length.toString())} snapshots`);
      console.log(`Storage: ${chalk.cyan(formatBytes(usage.totalSize))}`);
      console.log(`Oldest: ${chalk.dim(usage.oldestSnapshot ? formatDate(usage.oldestSnapshot) : 'N/A')}`);
      console.log(`Newest: ${chalk.dim(usage.newestSnapshot ? formatDate(usage.newestSnapshot) : 'N/A')}`);

      console.log(chalk.dim('\n' + '─'.repeat(60) + '\n'));

      for (const snap of snapshots) {
        const tags = snap.tags ? snap.tags.map(t => chalk.cyan(`#${t}`)).join(' ') : '';
        console.log(`${chalk.bold(snap.name)} ${chalk.dim(`(${snap.id})`)}`);
        console.log(`  Created: ${chalk.dim(formatDate(snap.createdAt))}`);
        console.log(`  Size: ${chalk.cyan(formatBytes(snap.size))}`);
        console.log(`  Items: ${chalk.cyan(snap.itemCount.toString())}`);
        if (tags.length > 0) {
          console.log(`  Tags: ${tags}`);
        }
        if (options.verbose && snap.description) {
          console.log(`  Description: ${chalk.dim(snap.description)}`);
        }
        console.log('');
      }

      db.close();

    } catch (error) {
      spinner.fail('Failed to list snapshots');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Snapshot diff command
 */
export const snapshotDiffCommand = new Command('snapshot')
  .alias('snap-diff')
  .description('Compare two snapshots')
  .argument('<snapshot-a>', 'First snapshot ID or path')
  .argument('<snapshot-b>', 'Second snapshot ID or path')
  .option('-v, --verbose', 'Show detailed differences')
  .option('--json', 'Output in JSON format')
  .action(async (snapshotA, snapshotB, options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);
      const manager = new SnapshotManager(db, projectRoot, 'unknown');

      spinner.start('Comparing snapshots...');

      const diff = await manager.diffSnapshots(snapshotA, snapshotB);

      spinner.stop();

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(diff, null, 2));
        db.close();
        return;
      }

      // Regular output
      console.log(chalk.bold('\nSnapshot Comparison'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(`Snapshot A: ${chalk.cyan(diff.snapshotA)}`);
      console.log(`Snapshot B: ${chalk.cyan(diff.snapshotB)}`);

      console.log(chalk.bold('\nSummary:'));
      console.log(`  Only in A: ${chalk.yellow(diff.onlyInA.length.toString())}`);
      console.log(`  Only in B: ${chalk.yellow(diff.onlyInB.length.toString())}`);
      console.log(`  Changed: ${chalk.yellow(diff.differences.filter(d => d.changeType !== 'same').length.toString())}`);

      if (options.verbose || diff.differences.filter(d => d.changeType !== 'same').length <= 20) {
        console.log(chalk.bold('\nChanges:'));

        const changes = diff.differences.filter(d => d.changeType !== 'same');

        for (const change of changes.slice(0, 50)) {
          const icon = change.changeType === 'added' ? chalk.green('+') :
                      change.changeType === 'removed' ? chalk.red('-') :
                      change.changeType === 'modified' ? chalk.yellow('~') :
                      chalk.dim('=');

          const typeLabel = change.changeType === 'added' ? chalk.green('added') :
                            change.changeType === 'removed' ? chalk.red('removed') :
                            change.changeType === 'modified' ? chalk.yellow('modified') :
                            '';

          console.log(`  ${icon} ${chalk.cyan(change.id)} ${chalk.dim(`[${change.type}]`)}: ${change.name}`);
          if (typeLabel) {
            console.log(`      ${typeLabel}`);
          }
        }

        if (changes.length > 50) {
          console.log(chalk.dim(`\n... and ${changes.length - 50} more changes`));
        }
      } else {
        console.log(chalk.dim('\nRun with --verbose to see detailed changes.'));
      }

      db.close();

    } catch (error) {
      spinner.fail('Failed to compare snapshots');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Snapshot delete command
 */
export const snapshotDeleteCommand = new Command('snapshot')
  .alias('snap-delete')
  .description('Delete a snapshot')
  .argument('<snapshot-id>', 'Snapshot ID to delete')
  .option('-f, --force', 'Delete without confirmation')
  .action(async (snapshotId, options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      // Load database
      const { DatabaseClient } = await import('../../db/client.js');
      const { version: K0NTEXT_VERSION } = await import('../../cli/version/comparator.js');
      const db = new DatabaseClient(projectRoot);
      const manager = new SnapshotManager(db, projectRoot, K0NTEXT_VERSION);

      // Confirm deletion
      if (!options.force) {
        const confirmed = await confirm({
          message: `Delete snapshot ${snapshotId}? This cannot be undone.`,
          default: false
        });

        if (!confirmed) {
          console.log(chalk.dim('\nDeletion cancelled.\n'));
          db.close();
          return;
        }
      }

      spinner.start('Deleting snapshot...');

      const deleted = await manager.deleteSnapshot(snapshotId);

      if (deleted) {
        spinner.succeed(chalk.green('Snapshot deleted successfully!'));
      } else {
        spinner.fail(chalk.red('Snapshot not found'));
      }

      db.close();

    } catch (error) {
      spinner.fail('Failed to delete snapshot');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
