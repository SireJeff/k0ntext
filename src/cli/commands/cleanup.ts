import { Command } from 'commander';
import { CleanupAgent } from '../../agents/cleanup-agent.js';

export const cleanupCommand = new Command('cleanup')
  .description('Clean up context folders from other AI tools')
  .option('--dry-run', 'Show what would be removed')
  .option('--keep <folders>', 'Folders to keep (comma-separated)')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const agent = new CleanupAgent();
    // Pass only the options that have values
    const result = await agent.cleanup({
      dryRun: !!options.dryRun,
      keep: options.keep ? options.keep.split(',') : undefined,
      verbose: !!options.verbose,
    });

    console.log(`\nCleanup complete:`);
    console.log(`  Scanned: ${result.scanned} tool folders`);
    console.log(`  Removed: ${result.removed.length}`);
    console.log(`  Kept: ${result.kept.length}`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
  });