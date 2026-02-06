#!/usr/bin/env node

/**
 * Import Command
 *
 * Imports context data from exported files.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

export const importCommand = new Command('import')
  .description('Import context data from file')
  .argument('<input>', 'Input file path')
  .option('--format <format>', 'Import format (json, markdown)', 'json')
  .option('--merge', 'Merge with existing data (default: replace)')
  .action(async (input, options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      const inputPath = path.resolve(projectRoot, input);

      if (!fs.existsSync(inputPath)) {
        spinner.fail('Input file not found');
        console.error(chalk.red(`\nError: File not found: ${inputPath}`));
        process.exit(1);
      }

      spinner.start('Importing data...');

      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);

      let importCount = 0;

      if (options.format === 'json') {
        const content = fs.readFileSync(inputPath, 'utf-8');
        const data = JSON.parse(content);

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid import file format');
        }

        for (const item of data.items) {
          db.upsertItem({
            type: item.type,
            name: item.name,
            content: item.content,
            metadata: item.metadata,
            filePath: item.filePath
          });
          importCount++;
        }
      } else {
        spinner.fail('Markdown import not yet supported');
        console.error(chalk.yellow(`\nNote: Only JSON format is currently supported for import.`));
        process.exit(1);
      }

      db.close();

      spinner.succeed(`Imported ${importCount} items from ${input}`);

    } catch (error) {
      spinner.fail('Import failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
