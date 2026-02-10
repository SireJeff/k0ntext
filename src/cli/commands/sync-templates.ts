/**
 * Template Sync Command
 *
 * CLI command for syncing .claude/ templates from package templates/base/
 */

import { Command } from 'commander';
import { DatabaseClient } from '../../db/client.js';
import { TemplateSyncEngine } from '../../template-sync/index.js';
import { TEMPLATE_SUBDIRS } from '../../template-sync/types.js';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync templates command
 */
export const syncTemplatesCommand = new Command('sync-templates')
  .description('Sync .claude/ templates from package templates/base/')
  .option('--dry-run', 'Show changes without applying them')
  .option('--force', 'Auto-overwrite conflicts without prompting')
  .option('--subdirs <dirs>', 'Comma-separated subdirectories to sync (commands,agents,schemas,standards,tools,automation)')
  .option('-v, --verbose', 'Show detailed output including diffs')
  .option('--no-archive', 'Skip archiving removed files')
  .action(async (options) => {
    const spinner = ora({ spinner: 'dots' }).start();

    try {
      // Parse subdirectories if provided
      let subdirectories;
      if (options.subdirs) {
        const requestedDirs = options.subdirs.split(',').map((s: string) => s.trim().toLowerCase());
        subdirectories = requestedDirs.filter((d: string) => TEMPLATE_SUBDIRS.includes(d as any));

        if (subdirectories.length === 0) {
          spinner.stop();
          console.error(chalk.red(`\n✖ Error: No valid subdirectories provided`));
          console.error(chalk.gray(`  Valid options: ${TEMPLATE_SUBDIRS.join(', ')}`));
          process.exit(1);
        }

        if (subdirectories.length !== requestedDirs.length) {
          const invalid = requestedDirs.filter((d: string) => !TEMPLATE_SUBDIRS.includes(d as any));
          console.warn(chalk.yellow(`\n⚠ Warning: Invalid subdirectories ignored: ${invalid.join(', ')}`));
        }
      }

      // Initialize database and engine
      const db = new DatabaseClient(process.cwd());
      // Path needs to go up from dist/cli/commands to the project root, then to templates/base
      const templateRoot = path.resolve(__dirname, '../../../templates/base');
      const engine = new TemplateSyncEngine(db, process.cwd(), templateRoot);

      // Check status
      spinner.text = 'Checking template sync status...';
      const status = await engine.getStatusSummary();

      spinner.stop();

      if (status.manifestExists && status.templateVersion) {
        console.log(chalk.gray(`\nCurrent template version: ${status.templateVersion}`));
        console.log(chalk.gray(`Package version: ${status.currentVersion}`));
      }

      if (status.userModifiedFiles.length > 0) {
        console.log(chalk.yellow(`\n⚠ ${status.userModifiedFiles.length} user-modified file(s) detected:`));
        for (const file of status.userModifiedFiles.slice(0, 5)) {
          console.log(chalk.dim(`  • ${file}`));
        }
        if (status.userModifiedFiles.length > 5) {
          console.log(chalk.dim(`  ... and ${status.userModifiedFiles.length - 5} more`));
        }
      }

      // Check if sync is actually needed (has files to sync)
      if (!options.force) {
        const { TemplateComparator } = await import('../../template-sync/index.js');
        const comparator = new TemplateComparator(db, process.cwd(), path.resolve(__dirname, '../../../templates/base'), options.verbose);
        const comparisonResult = await comparator.compare();

        const actionableFiles = TemplateComparator.getActionableComparisons(comparisonResult.comparisons);

        if (actionableFiles.length === 0 && status.manifestExists) {
          console.log(chalk.green('\n✓ Templates are already up to date'));
          db.close();
          return;
        }

        if (actionableFiles.length > 0) {
          console.log(chalk.cyan(`\n${actionableFiles.length} file(s) need syncing:`));
          actionableFiles.slice(0, 5).forEach(f => console.log(chalk.dim(`  • ${f.path}`)));
          if (actionableFiles.length > 5) {
            console.log(chalk.dim(`  ... and ${actionableFiles.length - 5} more`));
          }
        }
      }

      console.log('');

      // Configure sync options
      const syncOptions = {
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        subdirectories: subdirectories as any,
        verbose: options.verbose ?? false,
        archiveRemoved: options.archive !== false
      };

      // Execute sync
      const result = await engine.sync(syncOptions);

      // Display results
      if (!options.dryRun) {
        console.log('');
        console.log(chalk.bold('Sync Summary:'));
        console.log(chalk.cyan(`  Total files: ${result.total}`));
        console.log(chalk.green(`  Updated: ${result.updated}`));
        console.log(chalk.cyan(`  Created: ${result.created}`));
        console.log(chalk.yellow(`  Skipped: ${result.skipped.length}`));

        if (result.conflicts.length > 0) {
          console.log(chalk.red(`  Conflicts: ${result.conflicts.length}`));
          for (const conflict of result.conflicts.slice(0, 3)) {
            console.log(chalk.dim(`    - ${conflict.path}`));
          }
          if (result.conflicts.length > 3) {
            console.log(chalk.dim(`    ... and ${result.conflicts.length - 3} more`));
          }
          console.log(chalk.gray('\n  Run again to resolve conflicts individually'));
        }

        if (result.userOnly.length > 0 && options.archive !== false) {
          console.log(chalk.gray(`  Archived: ${result.userOnly.length} removed file(s)`));
        }

        console.log(chalk.gray(`  Duration: ${result.durationMs}ms`));

        if (result.conflicts.length === 0) {
          console.log(chalk.green('\n✓ Template sync complete!'));
        } else {
          console.log(chalk.yellow('\n⚠ Template sync complete with unresolved conflicts'));
        }
      }

      db.close();
    } catch (error) {
      spinner.fail(chalk.red('Sync failed'));
      console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Template status command (shows current sync status)
 */
export const templateStatusCommand = new Command('template-status')
  .description('Show template sync status')
  .option('-v, --verbose', 'Show detailed status')
  .action(async (options) => {
    const spinner = ora({ spinner: 'dots' }).start();

    try {
      const db = new DatabaseClient(process.cwd());
      const templateRoot = path.resolve(__dirname, '../../templates/base');
      const engine = new TemplateSyncEngine(db, process.cwd(), templateRoot);

      const status = await engine.getStatusSummary();

      spinner.stop();

      console.log('');
      console.log(chalk.bold('Template Sync Status:\n'));

      console.log(`${chalk.cyan('Package Version:')} ${status.currentVersion}`);

      if (status.manifestExists) {
        console.log(`${chalk.cyan('Template Version:')} ${status.templateVersion || 'unknown'}`);

        if (status.needsUpdate) {
          console.log(chalk.yellow('  ⚠ Templates are outdated'));
        } else {
          console.log(chalk.green('  ✓ Templates are up to date'));
        }
      } else {
        console.log(chalk.yellow('  No manifest found - run sync to initialize'));
      }

      if (status.userModifiedFiles.length > 0) {
        console.log(`\n${chalk.cyan('User-Modified Files:')} ${status.userModifiedFiles.length}`);
        if (options.verbose) {
          for (const file of status.userModifiedFiles) {
            console.log(chalk.dim(`  • ${file}`));
          }
        }
      }

      console.log('');

      db.close();
    } catch (error) {
      spinner.fail(chalk.red('Status check failed'));
      console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
