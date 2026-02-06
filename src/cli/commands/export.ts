#!/usr/bin/env node

/**
 * Export Command
 *
 * Exports context database to various formats (JSON, markdown).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

export const exportCommand = new Command('export')
  .description('Export context database to file')
  .argument('<output>', 'Output file path')
  .option('--format <format>', 'Export format (json, markdown)', 'json')
  .option('--type <type>', 'Filter by context type')
  .action(async (output, options) => {
    const spinner = ora();
    const projectRoot = process.cwd();

    try {
      spinner.start('Exporting database...');

      const { DatabaseClient } = await import('../../db/client.js');
      const db = new DatabaseClient(projectRoot);

      const items = options.type
        ? db.getItemsByType(options.type)
        : db.getAllItems();

      db.close();

      const outputPath = path.resolve(projectRoot, output);

      if (options.format === 'json') {
        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items: items.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            content: item.content,
            metadata: item.metadata,
            filePath: item.filePath
          }))
        };

        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      } else if (options.format === 'markdown') {
        let markdown = `# K0ntext Export\n\n`;
        markdown += `**Exported:** ${new Date().toISOString()}\n`;
        markdown += `**Items:** ${items.length}\n\n`;

        for (const item of items) {
          markdown += `## ${item.name} (${item.type})\n\n`;
          markdown += `**ID:** \`${item.id}\`\n\n`;
          if (item.filePath) {
            markdown += `**Path:** \`${item.filePath}\`\n\n`;
          }
          markdown += `${item.content}\n\n---\n\n`;
        }

        fs.writeFileSync(outputPath, markdown);
      } else {
        spinner.fail('Invalid format');
        console.error(chalk.red(`\nError: Format must be 'json' or 'markdown'`));
        process.exit(1);
      }

      spinner.succeed(`Exported ${items.length} items to ${outputPath}`);

    } catch (error) {
      spinner.fail('Export failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
