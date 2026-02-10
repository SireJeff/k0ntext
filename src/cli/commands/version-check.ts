/**
 * Version Check Command
 *
 * CLI command to check if context files are outdated.
 * Users can run this independently or it will be integrated into `init`.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '../../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const K0NTEXT_VERSION = packageJson.version;

import { checkContextFiles, showVersionSummary, promptRegeneration } from '../version/index.js';
import type { DatabaseClient } from '../../db/client.js';

/**
 * Perform regeneration of outdated files
 *
 * @param outdatedFiles - Files to regenerate
 * @param projectRoot - Project root directory
 */
async function regenerateFiles(
  outdatedFiles: Array<{ tool: string; filePath: string }>,
  projectRoot: string
): Promise<void> {
  const { DatabaseClient } = await import('../../db/client.js');
  const db = new DatabaseClient(projectRoot);

  // Check database has content
  const stats = db.getStats();
  if (stats.items === 0) {
    console.log(chalk.yellow('⚠ No context in database. Run `k0ntext index` first.'));
    return;
  }

  const { generateForTool } = await import('../generate.js');

  const spinner = ora('Regenerating context files...');

  for (const file of outdatedFiles) {
    spinner.text = `Regenerating ${file.tool} context...`;

    try {
      const resultPath = await generateForTool(file.tool, db, true, false, { verbose: false });
      if (resultPath) {
        spinner.succeed(chalk.green(`✓ Regenerated ${file.tool} context`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to regenerate ${file.tool}`));
      if (error instanceof Error) {
        console.error(chalk.dim(error.message));
      }
    }

    spinner.start();
  }

  spinner.stop();
  db.close();
}

/**
 * Version check command
 */
export const versionCheckCommand = new Command('check')
  .description('Check if context files are outdated')
  .option('--update', 'Prompt to update outdated files')
  .option('--force', 'Update without prompting')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();
    const verbose = options.verbose || false;

    try {
      spinner.start('Checking context file versions...');

      // Load database for modification detection
      let db: DatabaseClient | undefined;
      try {
        const { DatabaseClient } = await import('../../db/client.js');
        db = new DatabaseClient(projectRoot);
      } catch {
        // Database might not exist, that's okay
      }

      // Check versions
      const result = await checkContextFiles({
        projectRoot,
        currentVersion: K0NTEXT_VERSION,
        checkModifications: !!db
      }, db);

      spinner.stop();

      // Show summary
      showVersionSummary(result);

      // Close database if opened
      if (db) {
        db.close();
      }

      // Handle updates
      if (result.outdated.length > 0 && options.update) {
        if (options.force) {
          // Update without prompting
          console.log(chalk.bold('\nRegenerating files...'));
          await regenerateFiles(result.outdated, projectRoot);
          console.log(chalk.green('\n✓ All files regenerated successfully!'));
        } else {
          // Prompt user
          const promptResult = await promptRegeneration(result.outdated);

          if (promptResult.choice === 'skip') {
            console.log(chalk.dim('\nSkipped. Run `k0ntext check --update` later.'));
            return;
          }

          let filesToRegenerate = result.outdated;

          // Filter by user selection if needed
          if (promptResult.choice === 'select' && promptResult.selectedTools) {
            filesToRegenerate = result.outdated.filter(f =>
              promptResult.selectedTools?.includes(f.tool)
            );
          }

          // Skip modified files if user chose not to include them
          if (!promptResult.includeModified) {
            filesToRegenerate = filesToRegenerate.filter(f => !f.userModified);
          }

          console.log(chalk.bold('\nRegenerating files...'));
          await regenerateFiles(filesToRegenerate, projectRoot);
          console.log(chalk.green('\n✓ Files regenerated successfully!'));
        }
      } else if (result.outdated.length > 0) {
        console.log(chalk.dim(`\nRun ${chalk.white('k0ntext check --update')} to update outdated files.`));
      }

    } catch (error) {
      spinner.fail('Version check failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      if (verbose && error instanceof Error) {
        console.error(chalk.dim(error.stack));
      }
      process.exit(1);
    }
  });
