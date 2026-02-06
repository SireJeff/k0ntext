#!/usr/bin/env node

/**
 * Performance Command
 *
 * Display performance metrics and optimization suggestions.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export const performanceCommand = new Command('performance')
  .description('Show performance metrics and suggestions')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const { PerformanceMonitorAgent } = await import('../../agents/performance-agent.js');
      const agent = new PerformanceMonitorAgent(process.cwd());

      if (options.json) {
        console.log(JSON.stringify(agent.getMetrics(), null, 2));
      } else {
        console.log(agent.generateReport());

        const suggestions = agent.suggestOptimizations();
        if (suggestions.length > 0) {
          console.log(chalk.bold('\nOptimization Suggestions:'));
          for (const suggestion of suggestions) {
            console.log(`  ${chalk.cyan('•')} ${suggestion}`);
          }
        }
      }

      agent.close();

    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
