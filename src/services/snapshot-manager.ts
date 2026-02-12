/**
 * Snapshot Manager Service
 *
 * Manages database snapshots for save/restore functionality.
 * Creates compressed archives of database state for rollback capability.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import type { DatabaseClient } from '../db/client.js';

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  /** Unique snapshot ID */
  id: string;
  /** Snapshot name/title */
  name: string;
  /** Snapshot description */
  description?: string;
  /** When snapshot was created */
  createdAt: string;
  /** Snapshot size in bytes (compressed) */
  size: number;
  /** Number of context items in snapshot */
  itemCount: number;
  /** k0ntext version that created this snapshot */
  k0ntextVersion: string;
  /** Git commit SHA if available */
  gitCommit?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Whether snapshot is automatic (true) or manual (false) */
  automatic: boolean;
}

/**
 * Snapshot create options
 */
export interface SnapshotCreateOptions {
  /** Snapshot name */
  name: string;
  /** Snapshot description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Create without writing to disk (dry run) */
  dryRun?: boolean;
  /** Include git commit in metadata */
  includeGitCommit?: boolean;
  /** Compress snapshot (default: true) */
  compress?: boolean;
  /** Whether snapshot is automatic (default: false) */
  automatic?: boolean;
}

/**
 * Snapshot restore options
 */
export interface SnapshotRestoreOptions {
  /** Path to snapshot file */
  snapshotPath: string;
  /** Restore without confirmation */
  force?: boolean;
  /** Create backup before restoring */
  backupBeforeRestore?: boolean;
  /** Verify database after restore */
  verify?: boolean;
}

/**
 * Snapshot list entry
 */
export interface SnapshotListEntry {
  /** Snapshot ID */
  id: string;
  /** Snapshot name */
  name: string;
  /** Snapshot description */
  description?: string;
  /** When snapshot was created */
  createdAt: string;
  /** Snapshot size in bytes */
  size: number;
  /** Number of items */
  itemCount: number;
  /** Tags */
  tags?: string[];
  /** Snapshot file path */
  path: string;
}

/**
 * Snapshot diff result
 */
export interface SnapshotDiffResult {
  /** Snapshot A ID */
  snapshotA: string;
  /** Snapshot B ID */
  snapshotB: string;
  /** Items only in A */
  onlyInA: string[];
  /** Items only in B */
  onlyInB: string[];
  /** Items in both (with differences) */
  differences: Array<{
    id: string;
    type: string;
    name: string;
    changeType: 'added' | 'removed' | 'modified' | 'same';
  }>;
}

/**
 * Snapshot Manager
 *
 * Manages database snapshots with compression and verification.
 */
export class SnapshotManager {
  private db: DatabaseClient;
  private projectRoot: string;
  private snapshotsDir: string;
  private k0ntextVersion: string;

  constructor(db: DatabaseClient, projectRoot: string = process.cwd(), k0ntextVersion: string) {
    this.db = db;
    this.projectRoot = projectRoot;
    this.k0ntextVersion = k0ntextVersion;
    this.snapshotsDir = path.join(projectRoot, '.k0ntext', 'snapshots');
  }

  /**
   * Ensure snapshots directory exists
   */
  private async ensureSnapshotsDir(): Promise<void> {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    const date = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
    const random = crypto.randomBytes(4).toString('hex').substring(0, 8);
    return `snap-${date}-${random}`;
  }

  /**
   * Get snapshot file path
   */
  private getSnapshotPath(snapshotId: string): string {
    return path.join(this.snapshotsDir, `${snapshotId}.db`);
  }

  /**
   * Get compressed snapshot file path
   */
  private getCompressedSnapshotPath(snapshotId: string): string {
    return path.join(this.snapshotsDir, `${snapshotId}.db.gz`);
  }

  /**
   * Get git commit SHA if in git repository
   */
  private getGitCommit(): string | undefined {
    try {
      const commit = execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
      return commit || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Create a snapshot
   *
   * @param options - Snapshot creation options
   * @returns Snapshot metadata
   */
  async createSnapshot(options: SnapshotCreateOptions): Promise<SnapshotMetadata> {
    await this.ensureSnapshotsDir();

    const snapshotId = this.generateSnapshotId();
    const now = new Date().toISOString();

    // Get current database stats
    const stats = this.db.getStats();
    const gitCommit = options.includeGitCommit ? this.getGitCommit() : undefined;

    // Export database to temporary file
    const tempDbPath = path.join(this.snapshotsDir, `${snapshotId}.tmp`);
    await this.exportDatabase(tempDbPath);

    // Compress if requested
    let finalPath = this.getSnapshotPath(snapshotId);
    let size = 0;

    if (options.compress !== false) {
      finalPath = this.getCompressedSnapshotPath(snapshotId);
      await this.compressFile(tempDbPath, finalPath);
      const stats = await fs.stat(finalPath);
      size = stats.size;
    } else {
      // Move to final location
      await fs.rename(tempDbPath, finalPath);
      const stats = await fs.stat(finalPath);
      size = stats.size;
    }

    // Create metadata
    const metadata: SnapshotMetadata = {
      id: snapshotId,
      name: options.name,
      description: options.description,
      createdAt: now,
      size,
      itemCount: stats.items,
      k0ntextVersion: this.k0ntextVersion,
      gitCommit,
      tags: options.tags,
      automatic: false
    };

    // Save metadata
    await this.saveSnapshotMetadata(metadata);

    return metadata;
  }

  /**
   * Export current database to file
   */
  private async exportDatabase(outputPath: string): Promise<void> {
    // Use SQLite's backup command
    const dbPath = path.join(this.projectRoot, '.k0ntext.db');
    execSync(`sqlite3 "${dbPath}" ".backup '${outputPath}'"`, {
      stdio: 'pipe'
    });
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const zlib = await import('zlib');
    const input = await fs.readFile(inputPath);
    const compressed = zlib.gzipSync(input);
    await fs.writeFile(outputPath, compressed);
  }

  /**
   * List all snapshots
   *
   * @returns Array of snapshot entries
   */
  async listSnapshots(): Promise<SnapshotListEntry[]> {
    await this.ensureSnapshotsDir();

    const files = await fs.readdir(this.snapshotsDir);
    const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.db.gz'));

    const entries: SnapshotListEntry[] = [];

    for (const file of dbFiles) {
      const filePath = path.join(this.snapshotsDir, file);
      const stats = await fs.stat(filePath);

      // Extract ID from filename
      const id = file.replace(/\.(db|db\.gz)$/, '');

      // Load metadata
      const metadata = await this.loadSnapshotMetadata(id);

      entries.push({
        id,
        name: metadata?.name || id,
        createdAt: metadata?.createdAt || stats.mtime.toISOString(),
        size: stats.size,
        itemCount: metadata?.itemCount || 0,
        tags: metadata?.tags,
        path: filePath
      });
    }

    // Sort by creation date (newest first)
    return entries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Restore a snapshot
   *
   * @param options - Snapshot restore options
   * @returns True if restored successfully
   */
  async restoreSnapshot(options: SnapshotRestoreOptions): Promise<boolean> {
    const snapshotPath = options.snapshotPath;

    // Verify snapshot exists
    try {
      await fs.access(snapshotPath);
    } catch {
      throw new Error(`Snapshot not found: ${snapshotPath}`);
    }

    // Create backup if requested
    if (options.backupBeforeRestore) {
      await this.createBackupBeforeRestore();
    }

    // Decompress if needed
    let tempDbPath: string;
    if (snapshotPath.endsWith('.gz')) {
      tempDbPath = path.join(this.snapshotsDir, 'restore-tmp.db');
      await this.decompressFile(snapshotPath, tempDbPath);
    } else {
      tempDbPath = snapshotPath;
    }

    // Close current database connection
    this.db.close();

    // Replace current database
    const currentDbPath = path.join(this.projectRoot, '.k0ntext.db');
    await fs.unlink(currentDbPath);
    await fs.rename(tempDbPath, currentDbPath);

    // Reopen database connection
    const { DatabaseClient } = await import('../db/client.js');
    (this.db as any) = new DatabaseClient(this.projectRoot);

    // Verify if requested
    if (options.verify) {
      const verified = await this.verifyRestore(snapshotPath);
      if (!verified) {
        throw new Error('Snapshot verification failed');
      }
    }

    return true;
  }

  /**
   * Create backup before restoring
   */
  private async createBackupBeforeRestore(): Promise<void> {
    const now = new Date();
    const backupId = `pre-restore-${now.toISOString()}`;
    const backupPath = path.join(this.snapshotsDir, `${backupId}.db`);

    const currentDbPath = path.join(this.projectRoot, '.k0ntext.db');
    await fs.copyFile(currentDbPath, backupPath);
  }

  /**
   * Decompress a gzip file
   */
  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    const zlib = await import('zlib');
    const input = await fs.readFile(inputPath);
    const decompressed = zlib.gunzipSync(input);
    await fs.writeFile(outputPath, decompressed);
  }

  /**
   * Verify restored database
   */
  private async verifyRestore(snapshotPath: string): Promise<boolean> {
    // Check database can be opened
    try {
      const testQuery = this.db.prepare('SELECT 1').get();
      return testQuery !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Delete a snapshot
   *
   * @param snapshotId - Snapshot ID to delete
   * @returns True if deleted successfully
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    await this.ensureSnapshotsDir();

    // Delete snapshot file
    const snapshotPath = this.getSnapshotPath(snapshotId);
    const compressedPath = this.getCompressedSnapshotPath(snapshotId);

    let deleted = false;

    try {
      await fs.unlink(snapshotPath);
      deleted = true;
    } catch {
      // Compressed version might exist
    }

    try {
      await fs.unlink(compressedPath);
      deleted = true;
    } catch {
      // File might not exist
    }

    if (deleted) {
      // Delete metadata
      await this.deleteSnapshotMetadata(snapshotId);
    }

    return deleted;
  }

  /**
   * Diff two snapshots
   *
   * @param snapshotA - First snapshot ID or path
   * @param snapshotB - Second snapshot ID or path
   * @returns Diff result
   */
  async diffSnapshots(snapshotA: string, snapshotB: string): Promise<SnapshotDiffResult> {
    // Load both snapshot databases
    const dbA = await this.loadSnapshotDatabase(snapshotA);
    const dbB = await this.loadSnapshotDatabase(snapshotB);

    if (!dbA || !dbB) {
      throw new Error('Could not load one or both snapshots for diff');
    }

    // Get all items from both
    const itemsA = this.getAllContextItems(dbA);
    const itemsB = this.getAllContextItems(dbB);

    // Build lookup maps
    const mapA = new Map(itemsA.map(item => [item.id, item]));
    const mapB = new Map(itemsB.map(item => [item.id, item]));

    // Find differences
    const onlyInA: string[] = [];
    const onlyInB: string[] = [];
    const differences: SnapshotDiffResult['differences'] = [];

    const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

    for (const id of allIds) {
      const itemA = mapA.get(id);
      const itemB = mapB.get(id);

      if (!itemA) {
        onlyInB.push(id);
        differences.push({
          id,
          type: itemB?.type || 'unknown',
          name: itemB?.name || id,
          changeType: 'added'
        });
      } else if (!itemB) {
        onlyInA.push(id);
        differences.push({
          id,
          type: itemA?.type || 'unknown',
          name: itemA?.name || id,
          changeType: 'removed'
        });
      } else if (this.itemsDiffer(itemA, itemB)) {
        differences.push({
          id,
          type: itemA?.type || 'unknown',
          name: itemA?.name || id,
          changeType: 'modified'
        });
      } else {
        differences.push({
          id,
          type: itemA?.type || 'unknown',
          name: itemA?.name || id,
          changeType: 'same'
        });
      }
    }

    // Close temp databases
    dbA.close();
    dbB.close();

    return {
      snapshotA,
      snapshotB,
      onlyInA,
      onlyInB,
      differences
    };
  }

  /**
   * Load a snapshot database for reading
   */
  private async loadSnapshotDatabase(snapshotIdOrPath: string): Promise<DatabaseClient | null> {
    let snapshotPath: string;

    // Check if it's an ID or full path
    if (path.isAbsolute(snapshotIdOrPath)) {
      snapshotPath = snapshotIdOrPath;
    } else {
      snapshotPath = this.getSnapshotPath(snapshotIdOrPath);
      // Try compressed version
      try {
        await fs.access(snapshotPath);
      } catch {
        const compressedPath = this.getCompressedSnapshotPath(snapshotIdOrPath);
        if (await this.fileExists(compressedPath)) {
          snapshotPath = compressedPath;
        }
      }
    }

    // Verify file exists
    if (!(await this.fileExists(snapshotPath))) {
      return null;
    }

    // Create temporary copy for reading
    const tempPath = path.join(this.snapshotsDir, `temp-${Date.now()}.db`);

    try {
      if (snapshotPath.endsWith('.gz')) {
        await this.decompressFile(snapshotPath, tempPath);
      } else {
        await fs.copyFile(snapshotPath, tempPath);
      }

      const { DatabaseClient } = await import('../db/client.js');
      const tempDb = new DatabaseClient(path.dirname(tempPath), path.basename(tempPath));

      return tempDb;
    } catch {
      return null;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all context items from database
   */
  private getAllContextItems(database: DatabaseClient): Array<{ id: string; type: string; name: string }> {
    try {
      const items = database.prepare('SELECT id, type, name FROM context_items').all() as unknown[];
      return (items || []).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: typeof r.id === 'string' ? r.id : '',
          type: typeof r.type === 'string' ? r.type : '',
          name: typeof r.name === 'string' ? r.name : ''
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Check if two context items differ
   */
  private itemsDiffer(
    a: { id: string; type: string; name: string; content?: string },
    b: { id: string; type: string; name: string; content?: string }
  ): boolean {
    if (a.type !== b.type || a.name !== b.name) {
      return true;
    }
    // Could add content comparison here if needed
    return false;
  }

  /**
   * Save snapshot metadata
   */
  private async saveSnapshotMetadata(metadata: SnapshotMetadata): Promise<void> {
    const metadataPath = this.getMetadataPath(metadata.id);
    const content = JSON.stringify(metadata, null, 2);
    await fs.writeFile(metadataPath, content, 'utf-8');
  }

  /**
   * Get snapshot metadata path
   */
  private getMetadataPath(snapshotId: string): string {
    return path.join(this.snapshotsDir, `${snapshotId}.meta.json`);
  }

  /**
   * Load snapshot metadata
   */
  private async loadSnapshotMetadata(snapshotId: string): Promise<SnapshotMetadata | null> {
    const metadataPath = this.getMetadataPath(snapshotId);

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Delete snapshot metadata
   */
  private async deleteSnapshotMetadata(snapshotId: string): Promise<void> {
    const metadataPath = this.getMetadataPath(snapshotId);
    try {
      await fs.unlink(metadataPath);
    } catch {
      // Metadata might not exist
    }
  }

  /**
   * Create automatic snapshot (before risky operations)
   *
   * @param operation - Operation being performed
   * @returns Snapshot metadata
   */
  async createAutoSnapshot(operation: string): Promise<SnapshotMetadata> {
    return await this.createSnapshot({
      name: `Auto: ${operation}`,
      description: `Automatic snapshot before ${operation}`,
      tags: ['auto'],
      automatic: true,
      includeGitCommit: true
    });
  }

  /**
   * Get storage usage information
   *
   * @returns Storage statistics
   */
  async getStorageUsage(): Promise<{
    totalSnapshots: number;
    totalSize: number;
    oldestSnapshot?: string;
    newestSnapshot?: string;
  }> {
    const snapshots = await this.listSnapshots();

    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        totalSize: 0
      };
    }

    const totalSize = snapshots.reduce((sum, s) => sum + s.size, 0);

    return {
      totalSnapshots: snapshots.length,
      totalSize,
      oldestSnapshot: snapshots[snapshots.length - 1]?.createdAt,
      newestSnapshot: snapshots[0]?.createdAt
    };
  }

  /**
   * Clean up old snapshots
   *
   * @param daysOld - Remove snapshots older than this many days
   * @param keepMinimum - Always keep at least this many snapshots
   * @returns Number of snapshots removed
   */
  async cleanupOldSnapshots(daysOld: number = 90, keepMinimum: number = 5): Promise<number> {
    const snapshots = await this.listSnapshots();
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let removed = 0;

    // Sort by age (oldest first)
    const sortedByAge = [...snapshots].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Always keep the most recent snapshots
    const keepCount = Math.min(keepMinimum, sortedByAge.length);
    const toConsider = sortedByAge.slice(keepCount);

    for (const snapshot of toConsider) {
      if (new Date(snapshot.createdAt).getTime() < cutoff) {
        const deleted = await this.deleteSnapshot(snapshot.id);
        if (deleted) {
          removed++;
        }
      }
    }

    return removed;
  }
}
