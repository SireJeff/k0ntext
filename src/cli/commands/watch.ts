#!/usr/bin/env node

/**
 * Watch Command
 *
 * Watch for file changes and automatically update the index.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const watchCommand = new Command('watch')
  .description('Watch for file changes and auto-update index')
  .option('-d, --delay <ms>', 'Debounce delay in milliseconds', '1000')
  .action(async (options) => {
    const spinner = ora();
    const projectRoot = process.cwd();
    let debounceTimer: NodeJS.Timeout | null = null;

    try {
      const { createIntelligentAnalyzer } = await import('../../analyzer/intelligent-analyzer.js');
      const { DatabaseClient } = await import('../../db/client.js');

      const analyzer = createIntelligentAnalyzer(projectRoot);
      const db = new DatabaseClient(projectRoot);

      console.log(chalk.cyan('\n👀 Watching for file changes...\n'));
      console.log(chalk.gray('Press Ctrl+C to stop\n'));

      const onChange = async (filePath: string) => {
        // Debounce rapid changes
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(async () => {
          spinner.start(`Indexing: ${filePath}`);

          try {
            const relativePath = filePath.replace(projectRoot + '/', '').replace(projectRoot, '');
            const fs = await import('fs');
            const content = fs.readFileSync(filePath, 'utf-8');

            // Determine type based on path
            let type: 'doc' | 'code' | 'tool_config' = 'code';
            if (filePath.includes('.claude') && !filePath.endsWith('README.md')) {
              type = 'tool_config';
            } else if (filePath.endsWith('README.md')) {
              type = 'doc';
            }

            db.upsertItem({
              type,
              name: filePath.split('/').pop() || 'unknown',
              content,
              filePath: relativePath,
              metadata: { size: content.length }
            });

            spinner.succeed(`Indexed: ${relativePath}`);
          } catch (error) {
            spinner.fail(`Failed to index: ${filePath}`);
          }
        }, parseInt(options.delay as string, 10));
      };

      const cleanup = analyzer.setupFileWatcher(onChange);

      // Keep process alive
      process.on('SIGINT', () => {
        console.log(chalk.gray('\n\nStopping watcher...'));
        cleanup();
        db.close();
        process.exit(0);
      });

    } catch (error) {
      spinner.fail('Watch failed to start');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
