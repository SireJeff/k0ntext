/**
 * Migrate Command
 *
 * Database schema migration command with interactive prompts.
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { confirm, select } from '@inquirer/prompts';
import { DatabaseClient } from '../../db/client.js';
import { MigrationRunner } from '../../db/migrations/index.js';

/**
 * Main migrate command
 */
export const migrateCommand = new Command('migrate')
  .description('Manage database schema migrations')

  // Status subcommand
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const spinner = ora();

    try {
      const db = await DatabaseClient.create(process.cwd());
      const runner = new MigrationRunner(db, process.cwd());

      const status = await runner.getStatus();

      spinner.stop();

      console.log(chalk.bold('\nMigration Status:\n'));
      console.log(`  Current: ${chalk.cyan(status.currentVersion || 'none')}`);
      console.log(`  Target:   ${chalk.cyan(status.targetVersion)}`);
      console.log(`  Pending:  ${chalk.yellow(status.pending.length)} migration(s)\n`);

      if (status.pending.length > 0) {
        console.log(chalk.bold('Pending Migrations:'));
        for (const migration of status.pending) {
          const breaks = migration.breaks ? chalk.red(' [breaking]') : '';
          console.log(`  ${chalk.cyan(migration.version)}: ${migration.description}${breaks}`);
        }
        console.log('');
      }

      if (status.applied.length > 0) {
        console.log(chalk.bold('Applied Migrations:'));
        for (const applied of status.applied.slice(0, 5)) {
          console.log(chalk.dim(`  ${applied.version} (${applied.appliedAt})`));
        }
        if (status.applied.length > 5) {
          console.log(chalk.dim(`  ... and ${status.applied.length - 5} more`));
        }
        console.log('');
      }

      db.close();
    } catch (error) {
      spinner.fail('Status check failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  })

  // Up subcommand
  .command('up')
  .description('Apply pending migrations')
  .option('--dry-run', 'Show what would be done')
  .option('--force', 'Apply even if validation fails')
  .option('--no-backup', 'Skip creating backup')
  .action(async (options) => {
    const spinner = ora();

    try {
      const db = await DatabaseClient.create(process.cwd());
      const runner = new MigrationRunner(db, process.cwd());

      const status = await runner.getStatus();

      if (!status.needsMigration) {
        spinner.succeed('Database is up to date');
        db.close();
        return;
      }

      // Check for breaking changes
      const breaking = status.pending.filter(m => m.breaks);
      if (breaking.length > 0 && !options.force) {
        console.log(chalk.yellow(`\n⚠ ${breaking.length} breaking change(s) detected:\n`));
        for (const m of breaking) {
          console.log(chalk.red(`  ${m.version}: ${m.description}`));
        }
        console.log();

        const shouldContinue = await confirm({
          message: 'Continue with breaking changes?',
          default: false
        });

        if (!shouldContinue) {
          console.log(chalk.dim('\nMigration cancelled.\n'));
          db.close();
          return;
        }
      }

      // Summary
      console.log(chalk.bold(`\nApplying ${status.pending.length} migration(s):\n`));
      for (const migration of status.pending) {
        console.log(chalk.dim(`  ${migration.version}: ${migration.description}`));
      }
      console.log();

      const confirmed = options.dryRun || await confirm({
        message: 'Proceed?',
        default: true
      });

      if (!confirmed) {
        console.log(chalk.dim('\nMigration cancelled.\n'));
        db.close();
        return;
      }

      spinner.start('Applying migrations...');

      const results = await runner.migrate({
        dryRun: options.dryRun,
        force: options.force,
        backup: options.backup !== false,
        onProgress: (current, total, migration) => {
          spinner.text = `Applying ${current}/${total}: ${migration.description}`;
        }
      });

      spinner.stop();

      // Show results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        console.log(chalk.green(`\n✓ Applied ${successful.length} migration(s)`));
      }

      if (failed.length > 0) {
        console.log(chalk.red(`\n✖ ${failed.length} migration(s) failed:\n`));
        for (const result of failed) {
          console.log(chalk.red(`  ${result.version}: ${result.error}`));
        }
        console.log(chalk.dim(`\nRollback using: k0ntext migrate rollback`));
      }

      db.close();
    } catch (error) {
      spinner.fail('Migration failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  })

  // Rollback subcommand
  .command('rollback')
  .description('Rollback to a previous backup')
  .option('--backup <path>', 'Specific backup to restore')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      const db = await DatabaseClient.create(projectRoot);
      const runner = new MigrationRunner(db, projectRoot);

      const backups = await runner.getMigrationBackups();

      if (backups.length === 0) {
        console.log(chalk.yellow('\nNo migration backups found.\n'));
        db.close();
        return;
      }

      let selectedBackup: string;

      if (options.backup) {
        selectedBackup = options.backup;
      } else {
        spinner.stop();
        selectedBackup = await select({
          message: 'Select backup to restore:',
          choices: backups.map(b => ({
            name: b.replace('.k0ntext.db.pre-', '').replace('.bak', ''),
            value: b
          }))
        });
      }

      const confirmed = await confirm({
        message: 'This will replace your current database. Continue?',
        default: false
      });

      if (!confirmed) {
        console.log(chalk.dim('\nRollback cancelled.\n'));
        db.close();
        return;
      }

      spinner.start('Restoring backup...');

      // Close database first
      db.close();

      // Restore from backup
      const backupPath = path.join(projectRoot, '.k0ntext', 'backups', selectedBackup);
      const dbPath = path.join(projectRoot, '.k0ntext.db');

      await fs.copyFile(backupPath, dbPath);

      spinner.succeed(chalk.green('Database restored from backup'));
      console.log(chalk.dim(`\nBackup: ${selectedBackup}\n`));

    } catch (error) {
      spinner.fail('Rollback failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
