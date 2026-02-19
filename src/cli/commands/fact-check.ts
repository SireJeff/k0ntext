/**
 * Fact-Check Command
 *
 * CLI command for validating documentation accuracy using AI.
 *
 * @version 3.1.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createFactCheckAgent } from '../../agents/fact-check-agent.js';
import { createOpenRouterClient, hasOpenRouterKey } from '../../embeddings/openrouter.js';

export const factCheckCommand = new Command('fact-check')
  .description('Validate documentation accuracy using AI analysis')
  .argument('[files...]', 'Specific files to check (default: all docs)')
  .option('--fix', 'Automatically fix detected issues (experimental)')
  .option('-v, --verbose', 'Show detailed output')
  .option('--min-confidence <number>', 'Minimum confidence to report (0-1)', '0.5')
  .action(async (files, options) => {
    // Check for OpenRouter API key
    if (!hasOpenRouterKey()) {
      console.error(chalk.red('Error: OPENROUTER_API_KEY environment variable is required.'));
      console.error(chalk.dim('Get your API key at: https://openrouter.ai/keys'));
      process.exit(1);
    }

    const spinner = ora('Initializing fact-check agent...').start();

    try {
      const agent = createFactCheckAgent({
        openRouter: createOpenRouterClient()
      });

      const minConfidence = parseFloat(options.minConfidence);
      if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
        spinner.fail('Invalid min-confidence value');
        process.exit(1);
      }

      // Get files to check
      let filesToCheck: string[];
      if (files && files.length > 0) {
        filesToCheck = files;
      } else {
        spinner.text = 'Discovering documentation files...';
        filesToCheck = await agent.getDocumentationFiles();
      }

      if (filesToCheck.length === 0) {
        spinner.warn('No documentation files found');
        agent.close();
        return;
      }

      spinner.text = `Fact-checking ${filesToCheck.length} files...`;

      const results = await agent.factCheckMultiple(filesToCheck);

      spinner.stop();

      // Aggregate statistics
      const totalClaims = results.reduce((sum, r) => sum + r.summary.total, 0);
      const totalFactual = results.reduce((sum, r) => sum + r.summary.factual, 0);
      const totalNotFactual = results.reduce((sum, r) => sum + r.summary.notFactual, 0);

      // Print summary
      console.log(chalk.bold(`\n📋 Fact-Check Report`));
      console.log(chalk.dim(`─`.repeat(50)));
      console.log(`Files checked: ${chalk.cyan(results.length.toString())}`);
      console.log(`Claims analyzed: ${chalk.cyan(totalClaims.toString())}`);
      console.log(`Factual: ${chalk.green(totalFactual.toString())}`);
      console.log(`Issues found: ${totalNotFactual > 0 ? chalk.red(totalNotFactual.toString()) : chalk.green('0')}`);

      // Print details for files with issues
      const filesWithIssues = results.filter(r => r.summary.notFactual > 0);

      if (filesWithIssues.length === 0) {
        console.log(chalk.green('\n✓ All documentation is accurate!'));
        agent.close();
        return;
      }

      console.log(chalk.bold(`\n🔍 Issues Found:\n`));

      for (const result of filesWithIssues) {
        const issues = result.claims.filter(c => !c.factual && c.confidence >= minConfidence);

        if (issues.length === 0) continue;

        console.log(chalk.bold(result.file));

        for (const issue of issues) {
          const icon = issue.confidence < 0.7 ? chalk.yellow('⚠') : chalk.red('✖');
          const claim = issue.claim.length > 60 ? issue.claim.slice(0, 60) + '...' : issue.claim;

          console.log(`  ${icon} ${chalk.dim(`Line ${issue.line || '?'}:`)} ${chalk.white(claim)}`);
          console.log(chalk.dim(`    Confidence: ${(issue.confidence * 100).toFixed(0)}%`));

          if (issue.correction) {
            console.log(chalk.green(`    💡 ${issue.correction}`));
          }
          console.log('');
        }
      }

      // Summary
      console.log(chalk.bold(`\n💡 Suggestions:`));
      if (options.fix) {
        console.log(`  Run with --fix to automatically apply corrections (experimental)`);
      }
      console.log(`  Run ${chalk.cyan('k0ntext generate --map --force')} to regenerate context files`);

      agent.close();

    } catch (error) {
      spinner.fail('Fact-check failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));

      if (options.verbose) {
        console.error(chalk.dim((error as Error).stack));
      }

      process.exit(1);
    }
  });
