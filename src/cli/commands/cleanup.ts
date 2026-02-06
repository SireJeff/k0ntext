import { CleanupAgent } from '../../agents/cleanup-agent';

export const cleanupCommand = {
  name: 'cleanup',
  description: 'Clean up context folders from other AI tools',
  options: [
    { flags: '--dry-run', description: 'Show what would be removed' },
    { flags: '--keep <folders>', description: 'Folders to keep (comma-separated)' },
    { flags: '--verbose', description: 'Show detailed output' },
  ],
  action: async (options: any) => {
    const agent = new CleanupAgent();
    const result = await agent.cleanup({
      dryRun: options.dryRun,
      keep: options.keep?.split(','),
      verbose: options.verbose,
    });

    console.log(`\nCleanup complete:`);
    console.log(`  Scanned: ${result.scanned} tool folders`);
    console.log(`  Removed: ${result.removed.length}`);
    console.log(`  Kept: ${result.kept.length}`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
  }
};