/**
 * Backup Manager
 *
 * Manages backups of generated context files before overwriting.
 * Supports both file-copy and git-stash based backup strategies.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import type { DatabaseClient } from '../../db/client.js';

/**
 * Backup result
 */
export interface BackupResult {
  /** Whether backup was successful */
  success: boolean;
  /** Path to backup file */
  backupPath?: string;
  /** Backup method used */
  method: 'file-copy' | 'git-stash' | 'none';
  /** Error message if failed */
  error?: string;
}

/**
 * Backup manager options
 */
export interface BackupManagerOptions {
  /** Base directory for backups (default: .k0ntext/backups) */
  backupDir?: string;
  /** Use git stash if available (default: true) */
  useGitStash?: boolean;
}

/**
 * Backup manager
 *
 * Creates and manages backups of generated files.
 */
export class BackupManager {
  private db: DatabaseClient;
  private projectRoot: string;
  private backupDir: string;
  private useGitStash: boolean;

  constructor(db: DatabaseClient, projectRoot: string, options: BackupManagerOptions = {}) {
    this.db = db;
    this.projectRoot = projectRoot;
    this.backupDir = options.backupDir || path.join(projectRoot, '.k0ntext', 'backups');
    this.useGitStash = options.useGitStash !== false;
  }

  /**
   * Create a backup of a file before overwriting
   *
   * @param filePath - Path to file to backup (can be relative or absolute)
   * @param tool - Tool name for organization
   * @returns Backup result
   */
  async createBackup(filePath: string, tool: string): Promise<BackupResult> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.projectRoot, filePath);

    try {
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        // File doesn't exist, no backup needed
        return { success: true, method: 'none' };
      }

      // Try git stash first if enabled
      if (this.useGitStash && await this.isGitRepository()) {
        const stashResult = await this.backupWithGitStash(fullPath, tool);
        if (stashResult.success) {
          return stashResult;
        }
        // Fall back to file copy if git stash fails
      }

      // Fall back to file copy
      return await this.backupWithFileCopy(fullPath, tool);
    } catch (error) {
      return {
        success: false,
        method: 'none',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Restore a file from backup
   *
   * @param backupPath - Path to backup file
   * @param targetPath - Path to restore to (can be relative or absolute)
   * @returns True if restore was successful
   */
  async restoreFromBackup(backupPath: string, targetPath: string): Promise<boolean> {
    const fullTargetPath = path.isAbsolute(targetPath) ? targetPath : path.join(this.projectRoot, targetPath);

    try {
      // Ensure target directory exists
      await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });

      // Copy backup to target
      await fs.copyFile(backupPath, fullTargetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all backups for a tool
   *
   * @param tool - Tool name
   * @returns Array of backup paths
   */
  async listBackups(tool: string): Promise<string[]> {
    const toolBackupDir = path.join(this.backupDir, tool);

    try {
      await fs.access(toolBackupDir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(toolBackupDir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => path.join(toolBackupDir, e.name));
  }

  /**
   * Backup using file copy strategy
   *
   * @param fullPath - Full path to file
   * @param tool - Tool name
   * @returns Backup result
   */
  private async backupWithFileCopy(fullPath: string, tool: string): Promise<BackupResult> {
    try {
      // Create backup directory
      const toolBackupDir = path.join(this.backupDir, tool);
      await fs.mkdir(toolBackupDir, { recursive: true });

      // Generate backup filename with timestamp
      const fileName = path.basename(fullPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.${timestamp}.bak`;
      const backupPath = path.join(toolBackupDir, backupFileName);

      // Copy file
      await fs.copyFile(fullPath, backupPath);

      // Update database with backup path
      const relativePath = path.relative(this.projectRoot, fullPath);
      const record = this.db.getGeneratedFileInfo(tool, relativePath);
      if (record) {
        this.db.upsertGeneratedFile({
          tool,
          filePath: relativePath,
          contentHash: record.contentHash,
          backupPath
        });
      }

      return {
        success: true,
        backupPath,
        method: 'file-copy'
      };
    } catch (error) {
      return {
        success: false,
        method: 'none',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Backup using git stash strategy
   *
   * @param fullPath - Full path to file
   * @param tool - Tool name
   * @returns Backup result
   */
  private async backupWithGitStash(fullPath: string, tool: string): Promise<BackupResult> {
    try {
      const relativePath = path.relative(this.projectRoot, fullPath);

      // Create a stash with a descriptive message
      const stashMessage = `k0ntext-backup-${tool}-${Date.now()}`;
      const stashCommand = `git stash push -m "${stashMessage}" -- "${relativePath}"`;

      execSync(stashCommand, { cwd: this.projectRoot, stdio: 'pipe' });

      // Get the stash hash for reference
      const listCommand = 'git stash list --grep="^k0ntext-backup" -n 1';
      const stashList = execSync(listCommand, { cwd: this.projectRoot, encoding: 'utf-8' });
      const stashRef = stashList.split(':')[0].trim();

      // Update database with stash reference
      const record = this.db.getGeneratedFileInfo(tool, relativePath);
      if (record) {
        this.db.upsertGeneratedFile({
          tool,
          filePath: relativePath,
          contentHash: record.contentHash,
          backupPath: `git-stash:${stashRef}`
        });
      }

      return {
        success: true,
        backupPath: `git-stash:${stashRef}`,
        method: 'git-stash'
      };
    } catch {
      return {
        success: false,
        method: 'none',
        error: 'Git stash failed'
      };
    }
  }

  /**
   * Check if current directory is a git repository
   *
   * @returns True if git repository
   */
  private async isGitRepository(): Promise<boolean> {
    try {
      const gitDir = path.join(this.projectRoot, '.git');
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old backups
   *
   * @param tool - Tool name (optional, if not provided cleans all)
   * @param keepLast - Number of recent backups to keep (default: 5)
   */
  async cleanupOldBackups(tool?: string, keepLast = 5): Promise<void> {
    const tools = tool ? [tool] : ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'];

    for (const toolName of tools) {
      const backups = await this.listBackups(toolName);

      if (backups.length > keepLast) {
        // Sort by name (which includes timestamp)
        backups.sort();

        // Delete oldest backups
        const toDelete = backups.slice(0, backups.length - keepLast);
        for (const backupPath of toDelete) {
          try {
            await fs.unlink(backupPath);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    }
  }
}
