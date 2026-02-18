/**
 * Cross-Sync Command
 *
 * Intelligently synchronize context across all AI tools after drift detection.
 *
 * @version 3.1.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { DatabaseClient } from '../../db/client.js';
import { getModelFor, MODEL_CONFIG } from '../../config/models.js';
import { createOpenRouterClient, hasOpenRouterKey } from '../../embeddings/openrouter.js';
import { parseAIResponse } from '../../utils/ai-parser.js';
import { AI_TOOLS, AI_TOOL_FOLDERS } from '../../db/schema.js';

/**
 * Supported AI tools for cross-sync
 */
type SyncTool = 'claude' | 'copilot' | 'cline' | 'antigravity' | 'windsurf' | 'aider' | 'continue' | 'cursor' | 'gemini';
const SYNC_TOOLS: SyncTool[] = ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'];

/**
 * Result of cross-sync operation
 */
interface CrossSyncResult {
  synced: number;
  skipped: number;
  failed: number;
  details?: Array<{ file: string; tool: string; action: string }>;
}

export const crossSyncCommand = new Command('cross-sync')
  .description('Intelligently synchronize context across all AI tools after drift detection')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('--from <tool>', 'Sync only from specific tool')
  .option('--to <tools>', 'Sync only to specific tools (comma-separated)')
  .option('--affected <files>', 'Comma-separated list of affected files (if known)')
  .option('--verbose', 'Show detailed sync output')
  .action(async (options) => {
    // Check for OpenRouter API key (required for intelligent sync)
    if (!hasOpenRouterKey()) {
      console.error(chalk.red('Error: OPENROUTER_API_KEY environment variable is required.'));
      console.error(chalk.dim('Get your API key at: https://openrouter.ai/keys'));
      process.exit(1);
    }

    const spinner = ora('Analyzing sync state...').start();

    try {
      const db = new DatabaseClient(process.cwd());
      const openRouter = createOpenRouterClient();

      // Parse target tools
      const targetTools = options.to
        ? parseTools(options.to)
        : SYNC_TOOLS;

      // Get affected files (either from option or AI analysis)
      let affectedFiles: string[] = [];
      if (options.affected) {
        affectedFiles = options.affected.split(',').map((f: string) => f.trim());
      } else {
        spinner.text = 'Determining affected files...';
        affectedFiles = await getAffectedFiles(db, openRouter, spinner);
      }

      if (affectedFiles.length === 0) {
        spinner.succeed('No sync needed');
        db.close();
        return;
      }

      spinner.text = `Syncing ${affectedFiles.length} affected files to ${targetTools.length} tools...`;

      if (options.dryRun) {
        spinner.stop();
        console.log(chalk.yellow('\n🔍 Dry run - would sync the following:'));
        console.log(chalk.dim(`\nAffected files (${affectedFiles.length}):`));
        for (const file of affectedFiles) {
          console.log(`  ${chalk.cyan('•')} ${file}`);
        }
        console.log(chalk.dim(`\nTarget tools (${targetTools.length}):`));
        for (const tool of targetTools) {
          console.log(`  ${chalk.cyan('•')} ${tool}`);
        }
        db.close();
        return;
      }

      const result = await performCrossSync(db, openRouter, {
        affectedFiles,
        fromTool: options.from,
        toTools: targetTools,
        verbose: options.verbose
      });

      spinner.succeed(chalk.green(`Synced ${result.synced} files across ${targetTools.length} tools`));

      if (result.skipped > 0) {
        console.log(chalk.dim(`Skipped: ${result.skipped} files`));
      }

      if (result.failed > 0) {
        console.log(chalk.red(`Failed: ${result.failed} files`));
      }

      if (options.verbose && result.details) {
        console.log(chalk.bold('\n📋 Sync Details:'));
        for (const detail of result.details) {
          const icon = detail.action.includes('Success') ? chalk.green('✓') :
                       detail.action.includes('Skipped') ? chalk.yellow('○') :
                       chalk.red('✖');
          console.log(`  ${icon} ${detail.file} → ${chalk.cyan(detail.tool)}: ${detail.action}`);
        }
      }

      db.close();

    } catch (error) {
      spinner.fail('Cross-sync failed');
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Parse comma-separated tools list
 */
function parseTools(toolsString: string): SyncTool[] {
  const tools = toolsString.split(',').map(t => t.trim().toLowerCase() as SyncTool);
  const invalid = tools.filter(t => !SYNC_TOOLS.includes(t));

  if (invalid.length > 0) {
    console.error(chalk.red(`\n✖ Error: Invalid AI tools: ${invalid.join(', ')}`));
    console.error(chalk.dim(`  Valid options: ${SYNC_TOOLS.join(', ')}`));
    process.exit(1);
  }

  return tools;
}

/**
 * Get affected files from recent changes using AI analysis
 */
async function getAffectedFiles(
  db: DatabaseClient,
  openRouter: ReturnType<typeof createOpenRouterClient>,
  spinner: ReturnType<typeof ora>
): Promise<string[]> {
  const projectRoot = process.cwd();

  // Get recent git changes if available
  const recentChanges = await getRecentGitChanges(projectRoot);

  if (recentChanges.length === 0) {
    // No git history, check common context files
    return await getContextFilePaths(projectRoot);
  }

  // Use AI to determine which context files need updating
  try {
    const analysis = await openRouter.chat([
      {
        role: 'system',
        content: `You are a context sync expert. Given a list of changed files, determine which context files need updating.

Consider:
- If source code changed, documentation may need updates
- If workflows changed, CLAUDE.md or similar files may need updates
- If configs changed, tool-specific files may need updates

Respond with a JSON array of file paths that might need syncing. Focus on common context files like:
- CLAUDE.md
- AI_CONTEXT.md
- .github/copilot-instructions.md
- .cursorrules
- .clinerules
- etc.

Only return files that likely exist in the project. Return empty array [] if no context files are affected.`
      },
      {
        role: 'user',
        content: `Recently changed files:\n${recentChanges.map(f => `  - ${f.path}`).join('\n')}\n\n
Which context files should be checked for updates? Return JSON array of file paths.`
      }
    ], {
      model: getModelFor('SMART_MERGE'),
      temperature: MODEL_CONFIG.ANALYSIS_TEMPERATURE,
      maxTokens: 2048
    });

    // Parse response
    const suggestedFiles = parseFilePaths(analysis);

    // Verify files exist before including them
    const existingFiles: string[] = [];
    for (const file of suggestedFiles) {
      try {
        await fs.access(path.join(projectRoot, file));
        existingFiles.push(file);
      } catch {
        // File doesn't exist, skip it
      }
    }

    return existingFiles.length > 0 ? existingFiles : await getContextFilePaths(projectRoot);

  } catch (error) {
    spinner.warn(`AI analysis failed, checking all context files: ${error}`);
    return await getContextFilePaths(projectRoot);
  }
}

/**
 * Get recent git changes
 */
async function getRecentGitChanges(projectRoot: string): Promise<Array<{ path: string }>> {
  try {
    const { execSync } = await import('child_process');
    const output = execSync(
      'git diff --name-only HEAD~10 HEAD 2>nul || git diff --name-only HEAD^ 2>nul || git ls-files --modified',
      { cwd: projectRoot, encoding: 'utf-8' }
    );

    const files = output.trim().split('\n').filter(f => f.trim());
    return files.map(path => ({ path }));
  } catch {
    // Not a git repo or git not available
    return [];
  }
}

/**
 * Get all context file paths
 */
async function getContextFilePaths(projectRoot: string): Promise<string[]> {
  const patterns = [
    'CLAUDE.md',
    'AI_CONTEXT.md',
    '.github/copilot-instructions.md',
    '.clinerules',
    '.cursorrules',
    '.windsurf/rules.md',
    '.aider.conf.yml',
    '.continue/config.json',
    '.gemini/config.md'
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const fullPath = path.join(projectRoot, pattern);
    try {
      await fs.access(fullPath);
      files.push(pattern);
    } catch {
      // File doesn't exist
    }
  }

  // Also check for .claude directory files
  try {
    const claudeFiles = await glob('.claude/**/*.md', {
      cwd: projectRoot,
      absolute: false
    });
    files.push(...claudeFiles);
  } catch {
    // Ignore glob errors
  }

  return files;
}

/**
 * Parse JSON array of file paths from AI response
 */
function parseFilePaths(response: string): string[] {
  const parsed = parseAIResponse<string[]>(response);
  if (Array.isArray(parsed)) {
    return parsed.map(String);
  }

  return [];
}

/**
 * Perform the actual cross-sync operation
 */
async function performCrossSync(
  db: DatabaseClient,
  openRouter: ReturnType<typeof createOpenRouterClient>,
  options: {
    affectedFiles: string[];
    fromTool?: string;
    toTools: SyncTool[];
    verbose?: boolean;
  }
): Promise<CrossSyncResult> {
  const result: CrossSyncResult = {
    synced: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  const projectRoot = process.cwd();

  // For each affected file, determine what needs to be synced
  for (const file of options.affectedFiles) {
    const fullPath = path.join(projectRoot, file);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');

      // For each target tool, check if update is needed
      for (const tool of options.toTools) {
        const toolFilePath = getToolFilePath(tool, projectRoot);

        if (!toolFilePath) {
          result.skipped++;
          if (options.verbose) {
            result.details?.push({ file, tool, action: 'Skipped (no file path)' });
          }
          continue;
        }

        // Check if tool file exists
        let toolContent = '';
        try {
          toolContent = await fs.readFile(toolFilePath, 'utf-8');
        } catch {
          // File doesn't exist, will create it
        }

        // Use AI to determine sync action
        const syncAction = await determineSyncAction(openRouter, file, content, tool, toolContent);

        if (syncAction.action === 'update' || syncAction.action === 'create') {
          if (syncAction.content) {
            await fs.writeFile(toolFilePath, syncAction.content, 'utf-8');
            result.synced++;
            if (options.verbose) {
              result.details?.push({ file, tool, action: `Success (${syncAction.action})` });
            }
          }
        } else if (syncAction.action === 'skip') {
          result.skipped++;
          if (options.verbose) {
            result.details?.push({ file, tool, action: 'Skipped (up to date)' });
          }
        } else {
          result.failed++;
          if (options.verbose) {
            result.details?.push({ file, tool, action: 'Failed (no content)' });
          }
        }
      }

    } catch (error) {
      result.failed++;
      if (options.verbose) {
        result.details?.push({ file, tool: 'all', action: `Failed: ${error}` });
      }
    }
  }

  return result;
}

/**
 * Get the file path for a specific AI tool
 */
function getToolFilePath(tool: SyncTool, projectRoot: string): string | null {
  const paths: Record<SyncTool, string | null> = {
    claude: 'CLAUDE.md',
    copilot: '.github/copilot-instructions.md',
    cline: '.clinerules',
    antigravity: null, // Would need to check config
    windsurf: '.windsurf/rules.md',
    aider: '.aider.conf.yml',
    continue: '.continue/config.json',
    cursor: '.cursorrules',
    gemini: '.gemini/config.md'
  };

  const filePath = paths[tool];
  return filePath ? path.join(projectRoot, filePath) : null;
}

/**
 * Determine what sync action is needed for a tool
 */
async function determineSyncAction(
  openRouter: ReturnType<typeof createOpenRouterClient>,
  sourceFile: string,
  sourceContent: string,
  targetTool: SyncTool,
  existingContent: string
): Promise<{ action: 'update' | 'create' | 'skip'; content?: string }> {
  try {
    const response = await openRouter.chat([
      {
        role: 'system',
        content: `You are an expert at adapting AI context files for different AI coding assistants.

Your task is to adapt the source content for the target tool: ${targetTool}

Consider each tool's strengths and formatting preferences:
- Claude: Comprehensive context with structured sections
- Copilot: Concise instructions focused on code patterns
- Cline: Practical workflow guidance
- Cursor: Architecture and implementation patterns
- Gemini: Structured technical documentation

Respond with JSON:
{
  "action": "update" | "create" | "skip",
  "reason": "why this action",
  "content": "the adapted content (only if update/create)"
}

Use "skip" only if the existing content is already up-to-date with the source.`
      },
      {
        role: 'user',
        content: `Source file: ${sourceFile}

Source content:
${sourceContent.slice(0, 10000)}

${existingContent ? `Existing ${targetTool} content:\n${existingContent.slice(0, 5000)}` : '(no existing file)'}`
      }
    ], {
      model: getModelFor('SMART_MERGE'),
      temperature: MODEL_CONFIG.ANALYSIS_TEMPERATURE,
      maxTokens: MODEL_CONFIG.MERGE_MAX_TOKENS
    });

    const parsed = parseAIResponse<{ action: 'update' | 'create' | 'skip'; content?: string }>(response);
    return {
      action: parsed?.action || 'skip',
      content: parsed?.content
    };

  } catch (error) {
    // On error, skip to avoid breaking things
    return { action: 'skip' };
  }
}
