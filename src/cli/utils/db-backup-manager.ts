/**
 * Database Backup Manager
 *
 * Manages database backups for migration safety.
 */

import fs from 'fs/promises';
import path from 'path';
import type { DatabaseClient } from '../../db/client.js';

/**
 * Backup result
 */
export interface DbBackupResult {
  /** Whether backup was successful */
  success: boolean;
  /** Path to backup file */
  backupPath?: string;
  /** Size of backup in bytes */
  size?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Database backup manager
 *
 * Creates and manages backups of the SQLite database for migration safety.
 */
export class DbBackupManager {
  private db: DatabaseClient;
  private projectRoot: string;
  private readonly BACKUP_DIR = '.k0ntext/db-backups';
  private readonly KEEP_BACKUPS = 5;

  constructor(db: DatabaseClient, projectRoot: string) {
    this.db = db;
    this.projectRoot = projectRoot;
  }

  /**
   * Create a backup of the database
   *
   * @returns Backup result
   */
  async createBackup(): Promise<DbBackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `db-${timestamp}.db`;
      const backupPath = path.join(this.projectRoot, this.BACKUP_DIR, backupFileName);

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Use existing backup method from DatabaseClient
      this.db.backup(backupPath);

      // Get file size
      const stats = await fs.stat(backupPath);

      // Clean old backups (keep last 5)
      await this.cleanupOldBackups();

      return {
        success: true,
        backupPath,
        size: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List all database backups
   *
   * @returns Array of backup file names
   */
  async listBackups(): Promise<string[]> {
    const backupDir = path.join(this.projectRoot, this.BACKUP_DIR);

    try {
      await fs.access(backupDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(backupDir);
    return files
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();
  }

  /**
   * Restore from a backup
   *
   * @param backupFileName - Name of backup file to restore
   * @returns True if restore was successful
   */
  async restoreFromBackup(backupFileName: string): Promise<boolean> {
    const backupDir = path.join(this.projectRoot, this.BACKUP_DIR);
    const backupPath = path.join(backupDir, backupFileName);

    try {
      // Verify backup exists
      await fs.access(backupPath);

      // Get database path from DatabaseClient
      const dbPath = (this.db as any).dbPath;

      // Copy backup to main database location
      await fs.copyFile(backupPath, dbPath);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old backups (keep last 5)
   */
  private async cleanupOldBackups(): Promise<void> {
    const backupDir = path.join(this.projectRoot, this.BACKUP_DIR);

    try {
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(f => f.endsWith('.db'))
        .sort();

      // Keep last 5
      const toDelete = backups.slice(0, backups.length - this.KEEP_BACKUPS);

      for (const file of toDelete) {
        await fs.unlink(path.join(backupDir, file));
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
