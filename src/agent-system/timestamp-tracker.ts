/**
 * Timestamp Tracker
 *
 * Tracks file timestamps for synchronization and drift detection.
 * Stores and retrieves file modification times from the database.
 */

import fs from 'fs/promises';
import path from 'path';
import type { DatabaseClient } from '../db/client.js';

/**
 * File timestamp record
 */
export interface FileTimestamp {
  /** Relative file path from project root */
  path: string;
  /** Last modified time from filesystem */
  modifiedTime: string;
  /** File size in bytes */
  size: number;
  /** SHA-256 hash of file contents */
  hash: string;
  /** When timestamp was last checked */
  lastChecked: string;
  /** Git commit SHA if available */
  gitCommit?: string;
}

/**
 * Timestamp tracker options
 */
export interface TimestampTrackerOptions {
  /** Project root directory */
  projectRoot?: string;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Sync status for a file
 */
export interface SyncStatus {
  /** File path */
  path: string;
  /** Whether file is in sync */
  inSync: boolean;
  /** Expected vs actual modified time */
  timeDiff?: number;
  /** Expected vs actual hash */
  hashDiff?: boolean;
}

/**
 * Timestamp Tracker
 *
 * Manages file timestamps for synchronization tracking.
 */
export class TimestampTracker {
  private db: DatabaseClient;
  private projectRoot: string;
  private verbose: boolean;

  constructor(db: DatabaseClient, options: TimestampTrackerOptions = {}) {
    this.db = db;
    this.projectRoot = options.projectRoot || process.cwd();
    this.verbose = options.verbose || false;
  }

  /**
   * Record file timestamp
   *
   * @param filePath - Relative or absolute file path
   * @param gitCommit - Optional git commit SHA
   */
  async recordTimestamp(filePath: string, gitCommit?: string): Promise<FileTimestamp | null> {
    try {
      const relativePath = this.toRelativePath(filePath);
      const absolutePath = this.toAbsolutePath(relativePath);

      const stats = await fs.stat(absolutePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      const hash = this.db.hashContent(content);

      const timestamp: FileTimestamp = {
        path: relativePath,
        modifiedTime: stats.mtime.toISOString(),
        size: stats.size,
        hash,
        lastChecked: new Date().toISOString(),
        gitCommit
      };

      // Store in database
      this.db.prepare(
        'INSERT OR REPLACE INTO file_timestamps (path, modified_time, size, hash, last_checked, git_commit) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        relativePath,
        timestamp.modifiedTime,
        timestamp.size,
        timestamp.hash,
        timestamp.lastChecked,
        gitCommit || null
      );

      if (this.verbose) {
        console.log(`Recorded timestamp: ${relativePath}`);
      }

      return timestamp;
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to record timestamp for ${filePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Get stored timestamp for a file
   *
   * @param filePath - Relative or absolute file path
   * @returns Timestamp record or null
   */
  async getTimestamp(filePath: string): Promise<FileTimestamp | null> {
    try {
      const relativePath = this.toRelativePath(filePath);
      const row = this.db.prepare(
        'SELECT * FROM file_timestamps WHERE path = ?'
      ).get(relativePath) as Record<string, unknown> | undefined;

      if (!row) return null;

      return {
        path: typeof row.path === 'string' ? row.path : relativePath,
        modifiedTime: typeof row.modified_time === 'string' ? row.modified_time : '',
        size: typeof row.size === 'number' ? row.size : 0,
        hash: typeof row.hash === 'string' ? row.hash : '',
        lastChecked: typeof row.last_checked === 'string' ? row.last_checked : '',
        gitCommit: typeof row.git_commit === 'string' ? row.git_commit : undefined
      };
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to get timestamp for ${filePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Check if file is in sync
   *
   * Compares current file state with stored timestamp.
   *
   * @param filePath - Relative or absolute file path
   * @returns Sync status
   */
  async checkSync(filePath: string): Promise<SyncStatus> {
    try {
      const relativePath = this.toRelativePath(filePath);
      const absolutePath = this.toAbsolutePath(relativePath);

      // Get stored timestamp
      const stored = await this.getTimestamp(relativePath);
      if (!stored) {
        return {
          path: relativePath,
          inSync: false,
          hashDiff: true
        };
      }

      // Get current file state
      const stats = await fs.stat(absolutePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      const currentHash = this.db.hashContent(content);

      // Check if hash matches
      const hashDiff = currentHash !== stored.hash;
      if (hashDiff) {
        return {
          path: relativePath,
          inSync: false,
          hashDiff: true
        };
      }

      // Check time difference (allow 1 second tolerance for filesystem precision)
      const storedTime = new Date(stored.modifiedTime).getTime();
      const currentTime = stats.mtime.getTime();
      const timeDiff = Math.abs(currentTime - storedTime);

      // Consider out of sync if time differs by more than 1 second
      const inSync = timeDiff <= 1000;

      return {
        path: relativePath,
        inSync,
        timeDiff: timeDiff
      };
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to check sync for ${filePath}:`, error);
      }
      return {
        path: this.toRelativePath(filePath),
        inSync: false,
        hashDiff: true
      };
    }
  }

  /**
   * Check multiple files for sync status
   *
   * @param filePaths - Array of file paths
   * @returns Array of sync statuses
   */
  async checkMultipleSync(filePaths: string[]): Promise<SyncStatus[]> {
    const results: SyncStatus[] = [];

    for (const filePath of filePaths) {
      const status = await this.checkSync(filePath);
      results.push(status);
    }

    return results;
  }

  /**
   * Update timestamp for a file
   *
   * @param filePath - Relative or absolute file path
   * @param gitCommit - Optional git commit SHA
   */
  async updateTimestamp(filePath: string, gitCommit?: string): Promise<FileTimestamp | null> {
    return await this.recordTimestamp(filePath, gitCommit);
  }

  /**
   * Batch update timestamps for multiple files
   *
   * @param filePaths - Array of file paths
   * @returns Array of updated timestamps
   */
  async batchUpdateTimestamps(filePaths: string[]): Promise<FileTimestamp[]> {
    const results: FileTimestamp[] = [];

    for (const filePath of filePaths) {
      const timestamp = await this.updateTimestamp(filePath);
      if (timestamp) {
        results.push(timestamp);
      }
    }

    if (this.verbose) {
      console.log(`Batch updated ${results.length} timestamps`);
    }

    return results;
  }

  /**
   * Remove timestamp record
   *
   * @param filePath - File path to remove
   */
  async removeTimestamp(filePath: string): Promise<boolean> {
    try {
      const relativePath = this.toRelativePath(filePath);
      const result = this.db.prepare(
        'DELETE FROM file_timestamps WHERE path = ?'
      ).run(relativePath);

      const removed = result.changes > 0;

      if (removed && this.verbose) {
        console.log(`Removed timestamp: ${relativePath}`);
      }

      return removed;
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to remove timestamp for ${filePath}:`, error);
      }
      return false;
    }
  }

  /**
   * Get all tracked timestamps
   *
   * @returns Array of all timestamp records
   */
  async getAllTimestamps(): Promise<FileTimestamp[]> {
    try {
      const rows = this.db.prepare(
        'SELECT * FROM file_timestamps ORDER BY last_checked DESC'
      ).all() as unknown[];

      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          path: typeof r.path === 'string' ? r.path : '',
          modifiedTime: typeof r.modified_time === 'string' ? r.modified_time : '',
          size: typeof r.size === 'number' ? r.size : 0,
          hash: typeof r.hash === 'string' ? r.hash : '',
          lastChecked: typeof r.last_checked === 'string' ? r.last_checked : '',
          gitCommit: typeof r.git_commit === 'string' ? r.git_commit : undefined
        };
      });
    } catch (error) {
      if (this.verbose) {
        console.warn('Failed to get all timestamps:', error);
      }
      return [];
    }
  }

  /**
   * Get stale timestamp records
   *
   * @param daysOld - Consider records older than this many days as stale
   * @returns Array of stale timestamps
   */
  async getStaleTimestamps(daysOld: number = 30): Promise<FileTimestamp[]> {
    try {
      const cutoff = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)).toISOString();

      const rows = this.db.prepare(
        'SELECT * FROM file_timestamps WHERE last_checked < ? ORDER BY last_checked ASC'
      ).all(cutoff) as unknown[];

      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          path: typeof r.path === 'string' ? r.path : '',
          modifiedTime: typeof r.modified_time === 'string' ? r.modified_time : '',
          size: typeof r.size === 'number' ? r.size : 0,
          hash: typeof r.hash === 'string' ? r.hash : '',
          lastChecked: typeof r.last_checked === 'string' ? r.last_checked : '',
          gitCommit: typeof r.git_commit === 'string' ? r.git_commit : undefined
        };
      });
    } catch (error) {
      if (this.verbose) {
        console.warn('Failed to get stale timestamps:', error);
      }
      return [];
    }
  }

  /**
   * Clean up old timestamp records
   *
   * @param daysOld - Remove records older than this many days
   * @returns Number of records removed
   */
  async cleanupOldTimestamps(daysOld: number = 90): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)).toISOString();

      const result = this.db.prepare(
        'DELETE FROM file_timestamps WHERE last_checked < ?'
      ).run(cutoff);

      const removed = result.changes;

      if (this.verbose) {
        console.log(`Cleaned up ${removed} old timestamp records`);
      }

      return removed;
    } catch (error) {
      if (this.verbose) {
        console.warn('Failed to cleanup old timestamps:', error);
      }
      return 0;
    }
  }

  /**
   * Get sync summary for tracked files
   *
   * @returns Summary of sync status
   */
  async getSyncSummary(): Promise<{
    total: number;
    inSync: number;
    outOfSync: number;
    stale: number;
  }> {
    try {
      const all = await this.getAllTimestamps();
      const syncStatuses = await Promise.all(
        all.map(t => this.checkSync(t.path))
      );

      const inSync = syncStatuses.filter(s => s.inSync).length;
      const stale = await this.getStaleTimestamps(30);

      return {
        total: all.length,
        inSync,
        outOfSync: syncStatuses.length - inSync,
        stale: stale.length
      };
    } catch (error) {
      if (this.verbose) {
        console.warn('Failed to get sync summary:', error);
      }
      return {
        total: 0,
        inSync: 0,
        outOfSync: 0,
        stale: 0
      };
    }
  }

  /**
   * Convert to relative path if absolute
   */
  private toRelativePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return path.relative(this.projectRoot, filePath);
    }
    return filePath;
  }

  /**
   * Convert to absolute path if relative
   */
  private toAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.projectRoot, filePath);
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) {
      return `${date.toLocaleDateString()} (${diffDays}d ago)`;
    } else if (diffHours > 0) {
      return `${date.toLocaleDateString()} (${diffHours}h ago)`;
    } else if (diffMins > 0) {
      return `${date.toLocaleDateString()} (${diffMins}m ago)`;
    } else {
      return date.toLocaleTimeString();
    }
  }

  /**
   * Generate detailed status report
   */
  async generateStatusReport(): Promise<string> {
    const summary = await this.getSyncSummary();
    const allTimestamps = await this.getAllTimestamps();

    let report = '# Timestamp Tracker Status Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Total Tracked:** ${summary.total} files\n`;
    report += `- **In Sync:** ${summary.inSync} files\n`;
    report += `- **Out of Sync:** ${summary.outOfSync} files\n`;
    report += `- **Stale (>30 days):** ${summary.stale} files\n\n`;

    if (summary.outOfSync > 0) {
      report += `## Out of Sync Files\n\n`;
      const syncStatuses = await Promise.all(
        allTimestamps.map(t => this.checkSync(t.path))
      );
      const outOfSync = syncStatuses.filter(s => !s.inSync);

      for (const status of outOfSync.slice(0, 20)) {
        report += `### ${status.path}\n`;
        report += `- **Status:** Out of sync\n`;
        if (status.timeDiff) {
          report += `- **Time Diff:** ${status.timeDiff}ms\n`;
        }
        if (status.hashDiff) {
          report += `- **Hash:** Different\n`;
        }
        report += '\n';
      }

      if (outOfSync.length > 20) {
        report += `\n... and ${outOfSync.length - 20} more\n`;
      }
    }

    return report;
  }
}
