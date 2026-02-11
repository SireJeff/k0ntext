/**
 * Embeddings Refresh Command
 *
 * Regenerate embeddings with optional dimension validation.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { createIntelligentAnalyzer } from '../../analyzer/intelligent-analyzer.js';
import { hasOpenRouterKey } from '../../embeddings/openrouter.js';
import { DatabaseClient } from '../../db/client.js';
import { estimateTokens } from '../../utils/chunking.js';

/**
 * Embeddings refresh command
 */
export const embeddingsRefreshCommand = new Command('embeddings:refresh')
  .description('Regenerate embeddings for all indexed content')
  .option('--force', 'Force refresh even if dimensions change')
  .option('--batch-size <n>', 'Process in batches', '50')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = ora();

    try {
      // Check for OpenRouter API key
      if (!hasOpenRouterKey()) {
        spinner.fail('OPENROUTER_API_KEY not found');
        console.log(chalk.yellow('  Set OPENROUTER_API_KEY for embeddings generation'));
        console.log(chalk.dim('  Get your key at: https://openrouter.ai/keys\n'));
        process.exit(1);
      }

      const db = await DatabaseClient.create(process.cwd());
      const analyzer = createIntelligentAnalyzer(process.cwd());

      spinner.start('Checking embeddings status...');

      const rawDb = db.getRawDb();

      // Check if embeddings table exists and has data
      const tableExists = rawDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='embeddings'
      `).get() as { name: string } | undefined;

      let currentDimension = 0;
      if (tableExists) {
        const embedding = rawDb.prepare('SELECT embedding FROM embeddings LIMIT 1').get() as { embedding: Buffer } | undefined;
        if (embedding) {
          currentDimension = embedding.embedding.length / 4; // Float32Array
        }
      }

      const expectedDimension = 1536; // OpenRouter text-embedding-3-small

      if (currentDimension > 0 && currentDimension !== expectedDimension && !options.force) {
        spinner.fail('Embedding dimension mismatch');
        console.log(chalk.red(`  Current: ${currentDimension}, Expected: ${expectedDimension}`));
        console.log(chalk.dim('\nUse --force to override (requires full re-index)\n'));
        db.close();
        process.exit(1);
      }

      // Get all items
      spinner.text = 'Fetching items...';
      const items = db.getAllItems();

      if (items.length === 0) {
        spinner.succeed('No items to index');
        db.close();
        return;
      }

      spinner.stop();

      console.log('');
      console.log(chalk.bold('Embeddings Refresh:'));
      console.log(`  Items to process: ${chalk.cyan(items.length.toString())}`);
      console.log(`  Batch size: ${chalk.cyan(options.batchSize)}`);
      console.log('');

      const confirmed = await confirm({
        message: 'Refresh all embeddings?',
        default: true
      });

      if (!confirmed) {
        console.log(chalk.dim('\nRefresh cancelled.\n'));
        db.close();
        return;
      }

      spinner.start('Refreshing embeddings...');

      // Process in batches
      const batchSize = parseInt(options.batchSize, 10);
      let processed = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(items.length / batchSize);

        for (const item of batch) {
          if (options.verbose) {
            spinner.stop();
            const tokenEstimate = estimateTokens(item.content);
            const chunkInfo = tokenEstimate > 8000 ? chalk.yellow(` (${Math.ceil(tokenEstimate / 8000)} chunks)`) : '';
            console.log(chalk.dim(`  Embedding: ${item.name}${chunkInfo}`));
            spinner.start();
          }

          // Generate and store embedding
          try {
            const embedding = await analyzer.embedText(item.content);
            db.storeEmbedding(item.id, embedding);
            processed++;
          } catch (error) {
            if (options.verbose) {
              console.log(chalk.yellow(`  Warning: Failed to embed ${item.name}`));
            }
          }
        }

        spinner.text = `Processing batch ${batchNum}/${totalBatches} (${processed}/${items.length})...`;
      }

      spinner.succeed(chalk.green(`Refreshed ${processed} embeddings`));
      db.close();

    } catch (error) {
      spinner.fail('Embedding refresh failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
