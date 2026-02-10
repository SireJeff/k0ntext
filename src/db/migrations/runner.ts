/**
 * Migration Runner
 *
 * Core execution engine for database migrations.
 */

import path from 'path';
import fs from 'fs/promises';
import type { DatabaseClient } from '../client.js';
import type { Migration, MigrationResult, MigrationStatus, MigrationOptions } from './types.js';
import { discoverMigrations, loadMigration } from './loader.js';

/**
 * Migration runner class
 */
export class MigrationRunner {
  private db: DatabaseClient;
  private projectRoot: string;

  constructor(db: DatabaseClient, projectRoot: string) {
    this.db = db;
    this.projectRoot = projectRoot;
  }

  /**
   * Get current migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    // Get target version from SCHEMA_VERSION constant
    const { SCHEMA_VERSION } = await import('../schema.js');

    // Get applied migrations from schema_migrations table (if exists)
    const applied: Array<{ version: string; appliedAt: string }> = [];
    let currentVersion: string | null = null;

    try {
      const rawDb = this.getDb();

      // Check if schema_migrations table exists
      const tableExists = rawDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='schema_migrations'
      `).get() as { name: string } | undefined;

      if (tableExists) {
        const rows = rawDb.prepare(`
          SELECT version, applied_at FROM schema_migrations
          ORDER BY applied_at DESC
        `).all() as Array<{ version: string; applied_at: string }>;

        applied.push(...rows.map(r => ({ version: r.version, appliedAt: r.applied_at })));

        // Get latest version
        if (rows.length > 0) {
          currentVersion = rows[0].version;
        }
      } else {
        // Fall back to legacy schema_version table
        const row = rawDb.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: string } | undefined;
        if (row) {
          currentVersion = row.version;
          applied.push({ version: row.version, appliedAt: new Date().toISOString() });
        }
      }
    } catch {
      // Database might not exist yet
    }

    // Discover all migrations
    const allMigrations = await discoverMigrations();

    // Filter pending migrations
    const appliedVersions = new Set(applied.map(a => a.version));
    const pending = allMigrations.filter(m => !appliedVersions.has(m.version));

    return {
      currentVersion,
      targetVersion: SCHEMA_VERSION,
      pending,
      applied,
      needsMigration: pending.length > 0
    };
  }

  /**
   * Run pending migrations
   */
  async migrate(options: MigrationOptions = {}): Promise<MigrationResult[]> {
    const status = await this.getStatus();
    const results: MigrationResult[] = [];

    if (!status.needsMigration) {
      return results;
    }

    // Validate dependencies
    await this.validateDependencies(status.pending, options.force);

    // Create backup if requested
    if (options.backup !== false) {
      await this.createBackup();
    }

    // Run migrations in order
    for (let i = 0; i < status.pending.length; i++) {
      const migration = status.pending[i];

      // Progress callback
      options.onProgress?.(i + 1, status.pending.length, migration);

      const result = await this.applyMigration(migration, options);
      results.push(result);

      if (!result.success && !options.force) {
        // Stop on first error unless forced
        break;
      }
    }

    return results;
  }

  /**
   * Validate migration dependencies
   */
  private async validateDependencies(migrations: Migration[], force?: boolean): Promise<void> {
    const status = await this.getStatus();
    const appliedVersions = new Set(status.applied.map(a => a.version));

    for (const migration of migrations) {
      for (const dep of migration.dependencies) {
        if (!appliedVersions.has(dep)) {
          const msg = `Migration ${migration.version} depends on ${dep}, which is not applied`;
          if (force) {
            console.warn(`Warning: ${msg}`);
          } else {
            throw new Error(msg);
          }
        }
      }
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration, options: MigrationOptions): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      if (options.dryRun) {
        return {
          version: migration.version,
          success: true,
          durationMs: Date.now() - startTime
        };
      }

      const rawDb = this.getDb();

      // Begin transaction
      rawDb.exec('BEGIN TRANSACTION');

      try {
        // Apply SQL
        const sql = await fs.readFile(migration.sqlPath, 'utf-8');
        rawDb.exec(sql);

        // Run TypeScript up() if exists
        if (migration.tsPath) {
          const { up } = await loadMigration(migration.tsPath);
          await up(this.db);
        }

        // Record migration
        this.recordMigration(migration, true, Date.now() - startTime);

        // Update schema_version
        this.updateSchemaVersion(migration.version);

        rawDb.exec('COMMIT');

        return {
          version: migration.version,
          success: true,
          durationMs: Date.now() - startTime
        };
      } catch (error) {
        rawDb.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      // Record failed migration
      if (!options.dryRun) {
        this.recordMigration(migration, false, Date.now() - startTime, error instanceof Error ? error.message : String(error));
      }

      return {
        version: migration.version,
        success: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Record migration in schema_migrations table
   */
  private recordMigration(migration: Migration, success: boolean, durationMs: number, error?: string): void {
    const rawDb = this.getDb();

    // Create schema_migrations table if not exists (for initial migration)
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        description TEXT,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT NOT NULL,
        duration_ms INTEGER,
        success INTEGER DEFAULT 1
      )
    `);

    rawDb.prepare(`
      INSERT OR REPLACE INTO schema_migrations
      (version, description, checksum, duration_ms, success)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      migration.version,
      migration.description,
      migration.checksum,
      durationMs,
      success ? 1 : 0
    );
  }

  /**
   * Update legacy schema_version table
   */
  private updateSchemaVersion(version: string): void {
    const rawDb = this.getDb();
    rawDb.prepare(`
      INSERT OR REPLACE INTO schema_version (version, applied_at)
      VALUES (?, datetime('now'))
    `).run(version);
  }

  /**
   * Create backup before migration
   */
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `.k0ntext.db.pre-${timestamp}.bak`;
    const backupPath = path.join(this.projectRoot, '.k0ntext', 'backups', backupName);

    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Use existing backup method from DatabaseClient
    this.db.backup(backupPath);

    // Keep only last 5 migration backups
    await this.cleanupOldBackups();
  }

  /**
   * Clean up old migration backups (keep last 5)
   */
  private async cleanupOldBackups(): Promise<void> {
    const backupDir = path.join(this.projectRoot, '.k0ntext', 'backups');

    try {
      const files = await fs.readdir(backupDir);
      const migrationBackups = files
        .filter(f => f.includes('.pre-') && f.endsWith('.bak'))
        .sort()
        .reverse();

      // Keep last 5
      const toDelete = migrationBackups.slice(5);

      for (const file of toDelete) {
        await fs.unlink(path.join(backupDir, file));
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get migration backups
   */
  async getMigrationBackups(): Promise<string[]> {
    const backupDir = path.join(this.projectRoot, '.k0ntext', 'backups');

    try {
      const files = await fs.readdir(backupDir);
      return files
        .filter(f => f.includes('.pre-') && f.endsWith('.bak'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Get raw database instance
   */
  private getDb() {
    // Access the internal better-sqlite3 database
    return (this.db as any).db;
  }
}
