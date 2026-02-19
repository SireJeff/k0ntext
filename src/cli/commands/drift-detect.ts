/**
 * Drift Detection Command
 *
 * CLI command for detecting documentation drift using AI analysis.
 *
 * @version 3.1.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createDriftAgent } from '../../agents/drift-agent.js';
import { createOpenRouterClient, hasOpenRouterKey } from '../../embeddings/openrouter.js';

export const driftDetectCommand = new Command('drift-detect')
  .description('Detect documentation drift using AI analysis')
  .option('--fix', 'Automatically fix detected drift (experimental)')
  .option('--strict', 'Fail on any drift detected')
  .option('-p, --paths <paths>', 'Comma-separated paths to check')
  .option('--max-files <number>', 'Maximum number of files to check', '50')
  .option('--model <model>', 'Override model (not recommended)')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    // Check for OpenRouter API key
    if (!hasOpenRouterKey()) {
      console.error(chalk.red('Error: OPENROUTER_API_KEY environment variable is required.'));
      console.error(chalk.dim('Get your API key at: https://openrouter.ai/keys'));
      process.exit(1);
    }

    const spinner = ora('Analyzing codebase for drift...').start();

    try {
      const agent = createDriftAgent({
        openRouter: createOpenRouterClient(),
        model: options.model, // Use default from config if not specified
        strict: options.strict
      });

      const maxFiles = parseInt(options.maxFiles, 10);
      const result = await agent.detectDrift({
        paths: options.paths ? options.paths.split(',') : undefined,
        autoFix: options.fix,
        maxFiles: isNaN(maxFiles) ? 50 : maxFiles
      });

      spinner.stop();

      // Print summary
      console.log(chalk.bold(`\n📊 Drift Detection Report`));
      console.log(chalk.dim(`─`.repeat(50)));
      console.log(`Files checked: ${chalk.cyan(result.filesChecked.toString())}`);
      console.log(`Duration: ${chalk.dim(`${result.duration}ms`)}`);
      console.log(`Drifts found: ${result.drifts.length > 0 ? chalk.red(result.drifts.length.toString()) : chalk.green('0')}`);

      // Show auth failures if any
      if (result.authFailures && result.authFailures.length > 0) {
        console.log(chalk.red(`Authentication failures: ${result.authFailures.length}`));
        console.log(chalk.dim(`  ${result.authFailures.slice(0, 5).join(', ')}${result.authFailures.length > 5 ? '...' : ''}`));
        console.log(chalk.yellow(`\n⚠ Check your OPENROUTER_API_KEY`));

        // Exit with error if all files failed auth
        if (result.authFailures.length === result.filesChecked) {
          console.log(chalk.red('\n✖ All files failed authentication. Cannot detect drift.'));
          process.exit(1);
        }
      }

      // Show other errors if any
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow(`Other errors: ${result.errors.length}`));
        if (options.verbose) {
          for (const err of result.errors.slice(0, 3)) {
            console.log(chalk.dim(`  ${err.file}: ${err.error.substring(0, 60)}...`));
          }
        }
      }

      if (result.drifts.length === 0 && (!result.authFailures || result.authFailures.length === 0)) {
        console.log(chalk.green('\n✓ No drift detected!'));
        agent.close();
        return;
      }

      // Group drifts by severity
      const bySeverity = {
        high: result.drifts.filter(d => d.severity === 'high'),
        medium: result.drifts.filter(d => d.severity === 'medium'),
        low: result.drifts.filter(d => d.severity === 'low')
      };

      console.log(chalk.bold(`\n🔍 Drift Details:\n`));

      // Print high severity drifts first
      for (const drift of bySeverity.high) {
        printDrift(drift, 'high');
      }
      for (const drift of bySeverity.medium) {
        printDrift(drift, 'medium');
      }
      for (const drift of bySeverity.low) {
        printDrift(drift, 'low');
      }

      // Print fixes if any
      if (result.fixed > 0) {
        console.log(chalk.green(`\n✓ Fixed ${result.fixed} issues`));
      }

      // Suggest next steps
      console.log(chalk.bold(`\n💡 Suggestions:`));
      console.log(`  Run ${chalk.cyan('k0ntext cross-sync')} to update affected tool files`);
      console.log(`  Run ${chalk.cyan('k0ntext generate --all')} to regenerate context`);

      // Exit with error if strict mode and drifts remain
      if (options.strict && result.drifts.length > result.fixed) {
        console.log(chalk.red('\n✖ Drift detected in strict mode'));
        process.exit(1);
      }

      agent.close();

    } catch (error) {
      spinner.fail('Drift detection failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));

      if (options.verbose) {
        console.error(chalk.dim((error as Error).stack));
      }

      process.exit(1);
    }
  });

/**
 * Print a single drift issue
 */
function printDrift(drift: { file: string; severity: string; expected: string; actual: string; suggestion?: string; line?: number }, severity: 'high' | 'medium' | 'low'): void {
  const icon = severity === 'high' ? chalk.red('✖') : severity === 'medium' ? chalk.yellow('⚠') : chalk.blue('ℹ');
  const color = severity === 'high' ? chalk.red : severity === 'medium' ? chalk.yellow : chalk.blue;

  console.log(`${icon} ${color(drift.file)}${drift.line ? `:${drift.line}` : ''} [${severity.toUpperCase()}]`);

  if (drift.expected) {
    console.log(chalk.dim(`    Expected: ${truncate(drift.expected, 80)}`));
  }
  if (drift.actual) {
    console.log(chalk.dim(`    Found: ${truncate(drift.actual, 80)}`));
  }
  if (drift.suggestion) {
    console.log(chalk.green(`    💡 ${truncate(drift.suggestion, 80)}`));
  }
  console.log('');
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
