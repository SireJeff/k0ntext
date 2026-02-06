#!/usr/bin/env node

/**
 * Validate Command
 *
 * Validates context files and AI tool configurations for correctness.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';

export const validateCommand = new Command('validate')
  .description('Validate context files and configurations')
  .option('--fix', 'Automatically fix validation errors when possible')
  .option('--strict', 'Treat warnings as errors')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      spinner.start('Validating context files...');

      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);

      // First check database health
      const health = db.healthCheck();
      if (!health.healthy) {
        spinner.fail('Database health check failed');
        console.error(chalk.red(`\nError: ${health.error}`));
        process.exit(1);
      }

      const issues: Array<{ file: string; issue: string; severity: 'error' | 'warning' }> = [];

      // Validate context items
      const items = db.getAllItems();
      for (const item of items) {
        if (item.filePath) {
          const fullPath = path.join(projectRoot, item.filePath);
          if (!fs.existsSync(fullPath)) {
            issues.push({
              file: item.filePath,
              issue: 'File referenced in database does not exist',
              severity: 'error'
            });
          }
        }

        // Validate content is not empty
        if (!item.content || item.content.trim().length === 0) {
          issues.push({
            file: item.name,
            issue: 'Content is empty',
            severity: 'warning'
          });
        }
      }

      db.close();

      spinner.stop();

      if (issues.length === 0) {
        console.log(chalk.green('\n✓ All validations passed!'));
        return;
      }

      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warningCount = issues.filter(i => i.severity === 'warning').length;

      console.log(chalk.bold(`\nValidation Results:`));
      console.log(`  ${chalk.red('✖')} Errors: ${errorCount}`);
      console.log(`  ${chalk.yellow('⚠')} Warnings: ${warningCount}`);

      for (const issue of issues) {
        const icon = issue.severity === 'error' ? chalk.red('✖') : chalk.yellow('⚠');
        console.log(`\n  ${icon} ${issue.file}`);
        console.log(`    ${issue.issue}`);
      }

      if (options.strict && warningCount > 0) {
        process.exit(1);
      }

      if (errorCount > 0) {
        process.exit(1);
      }

    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
