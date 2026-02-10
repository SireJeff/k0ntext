/**
 * Version Checker
 *
 * Checks context files for outdated versions.
 * Integrates with database for efficient caching.
 */

import fs from 'fs/promises';
import path from 'path';
import type { DatabaseClient } from '../../db/client.js';
import { parseVersion, hasVersionMarker } from './parser.js';
import { needsUpdate, getUpdateType } from './comparator.js';
import type {
  CheckOptions,
  FileVersionStatus,
  VersionCheckResult,
  OutdatedFile
} from './types.js';

/**
 * Tool to file path mappings
 */
const TOOL_FILES: Record<string, string[]> = {
  claude: ['AI_CONTEXT.md', 'CLAUDE.md', '.claude/AI_CONTEXT.md'],
  copilot: ['.github/copilot-instructions.md'],
  cline: ['.clinerules'],
  antigravity: ['.agent/README.md'],
  windsurf: ['.windsurf/rules.md'],
  aider: ['.aider.conf.yml'],
  continue: ['.continue/config.json'],
  cursor: ['.cursorrules'],
  gemini: ['.gemini/config.md']
};

/**
 * Check a single file for version status
 *
 * @param filePath - Full path to the file
 * @param tool - Tool name
 * @param currentVersion - Current k0ntext version
 * @param db - Database client (optional, for modification detection)
 * @returns File version status
 */
export async function checkSingleFile(
  filePath: string,
  tool: string,
  currentVersion: string,
  db?: DatabaseClient
): Promise<FileVersionStatus> {
  // Check if file exists
  let exists = false;
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
    exists = true;
  } catch {
    // File doesn't exist
  }

  // Check for version marker
  const hasMarker = hasVersionMarker(content);
  const fileVersion = parseVersion(content);

  // Determine if outdated
  const isOutdated = fileVersion ? needsUpdate(fileVersion, currentVersion) : false;
  const updateType = fileVersion ? getUpdateType(fileVersion, currentVersion) : 'none';

  // Check if user modified (from database)
  let userModified = false;
  if (db && exists) {
    const tracked = db.getGeneratedFileInfo(tool, filePath);
    if (tracked?.userModified) {
      userModified = true;
    }
  }

  return {
    tool,
    filePath,
    exists,
    fileVersion,
    hasMarker,
    isOutdated,
    updateType,
    userModified
  };
}

/**
 * Check all context files for version status
 *
 * @param options - Check options
 * @param db - Database client (optional)
 * @returns Version check result
 */
export async function checkContextFiles(
  options: CheckOptions,
  db?: DatabaseClient
): Promise<VersionCheckResult> {
  const { projectRoot, currentVersion, tools: toolsToCheck } = options;

  const tools = toolsToCheck || Object.keys(TOOL_FILES);
  const results: VersionCheckResult = {
    currentVersion,
    checked: 0,
    outdated: [],
    upToDate: [],
    noVersion: []
  };

  for (const tool of tools) {
    const files = TOOL_FILES[tool] || [];
    const toolName = tool;

    for (const relativePath of files) {
      const fullPath = path.join(projectRoot, relativePath);

      const status = await checkSingleFile(fullPath, toolName, currentVersion, db);
      results.checked++;

      if (!status.exists) {
        continue; // Skip non-existent files
      }

      if (status.isOutdated) {
        results.outdated.push({
          tool: status.tool,
          filePath: status.filePath,
          fileVersion: status.fileVersion || 'unknown',
          currentVersion,
          updateType: status.updateType,
          userModified: status.userModified
        });
      } else if (status.hasMarker) {
        results.upToDate.push(status);
      } else {
        results.noVersion.push(status);
      }
    }
  }

  return results;
}

/**
 * Get all context file paths for a tool
 *
 * @param tool - Tool name
 * @returns Array of file paths
 */
export function getToolFiles(tool: string): string[] {
  return TOOL_FILES[tool] || [];
}

/**
 * Check if a tool is supported
 *
 * @param tool - Tool name
 * @returns True if supported
 */
export function isSupportedTool(tool: string): boolean {
  return tool in TOOL_FILES;
}

/**
 * Get all supported tools
 *
 * @returns Array of tool names
 */
export function getSupportedTools(): string[] {
  return Object.keys(TOOL_FILES);
}
