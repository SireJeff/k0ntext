import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CleanupAgent } from '../../agents/cleanup-agent.js';
import { hasOpenRouterKey, createOpenRouterClient } from '../../embeddings/openrouter.js';
import { getModelFor, MODEL_CONFIG } from '../../config/models.js';
import { parseAIResponse } from '../../utils/ai-parser.js';

export const cleanupCommand = new Command('cleanup')
  .description('Clean up context folders from other AI tools')
  .option('--dry-run', 'Show what would be removed')
  .option('--keep <folders>', 'Folders to keep (comma-separated)')
  .option('-v, --verbose', 'Show detailed output')
  .option('--ai', 'Use AI to intelligently analyze which folders can be safely removed')
  .action(async (options) => {
    const spinner = ora('Analyzing project structure...').start();

    if (options.ai) {
      if (!hasOpenRouterKey()) {
        spinner.warn('OPENROUTER_API_KEY not set, using standard cleanup');
        options.ai = false;
      } else {
        try {
          const openRouter = createOpenRouterClient();

          spinner.text = 'Using AI to analyze folders...';

          // Use AI to analyze which folders are safe to remove
          const analysis = await openRouter.chat([
            {
              role: 'system',
              content: `You are a project cleanup expert. Analyze the project structure and recommend which AI tool folders can be safely removed.

Consider:
- Is the folder actively used by the project?
- Does the folder contain important configuration?
- Is there an alternative tool being used?

Respond with JSON:
{
  "recommendations": [
    {
      "folder": ".cursor",
      "action": "keep" | "remove" | "ask",
      "reason": "why this action is recommended"
    }
  ]
}`
            },
            {
              role: 'user',
              content: 'Analyze this project and recommend which AI tool folders can be cleaned up.'
            }
          ], {
            model: getModelFor('CLEANUP'),
            temperature: MODEL_CONFIG.ANALYSIS_TEMPERATURE,
            maxTokens: 2048
          });

          spinner.stop();

          try {
            interface AIRecommendation {
              folder: string;
              action: 'keep' | 'remove' | 'ask';
              reason: string;
            }
            const result = parseAIResponse<{ recommendations: AIRecommendation[] }>(analysis);
            if (!result) throw new Error('Failed to parse AI response');

            console.log(chalk.bold('\n🤖 AI Cleanup Analysis:\n'));

            for (const rec of result.recommendations || []) {
              const icon = rec.action === 'keep' ? chalk.green('✓') :
                          rec.action === 'remove' ? chalk.red('✖') :
                          chalk.yellow('?');
              console.log(`${icon} ${chalk.cyan(rec.folder)}: ${rec.action}`);
              console.log(chalk.dim(`   ${rec.reason}\n`));
            }

            console.log(chalk.dim('Run cleanup again without --ai to apply changes.'));

          } catch {
            console.log(chalk.yellow('\nAI Analysis:'));
            console.log(analysis);
          }

          return;

        } catch (error) {
          spinner.warn(`AI analysis failed: ${error}, using standard cleanup`);
          options.ai = false;
        }
      }
    }

    spinner.stop();

    const agent = new CleanupAgent();
    // Pass only the options that have values
    const result = await agent.cleanup({
      dryRun: !!options.dryRun,
      keep: options.keep ? options.keep.split(',') : undefined,
      verbose: !!options.verbose,
    });

    console.log(chalk.bold(`\nCleanup complete:`));
    console.log(`  Scanned: ${chalk.cyan(result.scanned.toString())} tool folders`);

    // Use different messaging for dry-run
    if (options.dryRun) {
      const wouldRemoveCount = result.removed.filter(r => r.includes('(dry-run)')).length;
      console.log(`  Would remove: ${chalk.cyan(wouldRemoveCount.toString())}`);
    } else {
      console.log(`  Removed: ${chalk.cyan(result.removed.length.toString())}`);
    }

    console.log(`  Kept: ${chalk.cyan(result.kept.length.toString())}`);

    if (result.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${result.errors.length}`));
    }
  });