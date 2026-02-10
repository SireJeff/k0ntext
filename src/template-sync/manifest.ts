/**
 * Template Manifest Manager
 *
 * Manages template manifest in both database and file system.
 * Dual storage ensures reliability and easy inspection.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { DatabaseClient } from '../db/client.js';
import type { TemplateManifest, TemplateFileEntry } from './types.js';
import { TEMPLATE_SCHEMA_SQL } from '../db/schema.js';

/**
 * Manifest file path in .claude directory
 */
const MANIFEST_FILE_NAME = '.k0ntext-manifest.json';

/**
 * Manifest ID for database storage
 */
const MANIFEST_ID = 'current';

/**
 * Manages template manifest in both database and file system
 */
export class TemplateManifestManager {
  private readonly manifestPath: string;

  constructor(
    private db: DatabaseClient,
    private projectRoot: string = process.cwd()
  ) {
    this.manifestPath = path.join(projectRoot, '.claude', MANIFEST_FILE_NAME);
  }

  /**
   * Load manifest from file system
   *
   * @returns Manifest object or null if doesn't exist
   */
  async loadManifest(): Promise<TemplateManifest | null> {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf8');
      const manifest = JSON.parse(content) as TemplateManifest;
      this.validateManifest(manifest);
      return manifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      // Invalid JSON or validation error
      console.warn(`Warning: Invalid manifest file at ${this.manifestPath}`);
      return null;
    }
  }

  /**
   * Save manifest to file system
   *
   * @param manifest - Manifest to save
   */
  async saveManifest(manifest: TemplateManifest): Promise<void> {
    this.validateManifest(manifest);

    // Ensure directory exists
    const manifestDir = path.dirname(this.manifestPath);
    await fs.mkdir(manifestDir, { recursive: true });

    // Update timestamp
    manifest.updatedAt = new Date().toISOString();

    // Write manifest with proper formatting
    await fs.writeFile(
      this.manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  /**
   * Get manifest from database
   *
   * @returns Manifest object or null if doesn't exist
   */
  getDbManifest(): TemplateManifest | null {
    try {
      const stmt = this.db.getRawDb().prepare(`
        SELECT manifest
        FROM template_manifests
        WHERE id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const row = stmt.get(MANIFEST_ID) as { manifest: string } | undefined;
      if (!row) return null;

      const manifest = JSON.parse(row.manifest) as TemplateManifest;
      this.validateManifest(manifest);
      return manifest;
    } catch {
      return null;
    }
  }

  /**
   * Save manifest to database
   *
   * @param manifest - Manifest to save
   */
  saveDbManifest(manifest: TemplateManifest): void {
    this.validateManifest(manifest);

    // Update timestamp
    manifest.updatedAt = new Date().toISOString();

    const stmt = this.db.getRawDb().prepare(`
      INSERT OR REPLACE INTO template_manifests
        (id, k0ntext_version, template_version, manifest, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      MANIFEST_ID,
      manifest.k0ntextVersion,
      manifest.templateVersion,
      JSON.stringify(manifest)
    );
  }

  /**
   * Sync manifest between DB and file system
   * Uses DB as source of truth by default
   *
   * @param manifest - Manifest to sync
   * @param source - 'db' or 'file' to determine source of truth
   */
  async syncManifest(manifest: TemplateManifest, source: 'db' | 'file' = 'db'): Promise<void> {
    if (source === 'db') {
      this.saveDbManifest(manifest);
      await this.saveManifest(manifest);
    } else {
      await this.saveManifest(manifest);
      this.saveDbManifest(manifest);
    }
  }

  /**
   * Load manifest from both sources and reconcile
   * Prefers the most recently updated version
   *
   * @returns Reconciled manifest or null
   */
  async loadReconciledManifest(): Promise<TemplateManifest | null> {
    const fileManifest = await this.loadManifest();
    const dbManifest = this.getDbManifest();

    if (!fileManifest && !dbManifest) {
      return null;
    }

    if (!fileManifest) return dbManifest;
    if (!dbManifest) return fileManifest;

    // Both exist - prefer the most recently updated
    const fileDate = new Date(fileManifest.updatedAt || fileManifest.createdAt);
    const dbDate = new Date(dbManifest.updatedAt || dbManifest.createdAt);

    return fileDate > dbDate ? fileManifest : dbManifest;
  }

  /**
   * Get file entry from manifest
   *
   * @param relativePath - Relative path to file
   * @param manifest - Optional manifest to use (otherwise loads)
   * @returns File entry or null
   */
  async getFileEntry(relativePath: string, manifest?: TemplateManifest): Promise<TemplateFileEntry | null> {
    const activeManifest = manifest ?? await this.loadReconciledManifest();
    if (!activeManifest) return null;

    return activeManifest.files[relativePath] || null;
  }

  /**
   * Mark file as user-modified
   *
   * @param relativePath - Relative path to file
   * @param originalHash - Original template hash before modification
   */
  async markUserModified(relativePath: string, originalHash?: string): Promise<void> {
    const manifest = await this.loadReconciledManifest() ?? this.createEmptyManifest();

    if (manifest.files[relativePath]) {
      manifest.files[relativePath].userModified = true;
      if (originalHash) {
        manifest.files[relativePath].originalHash = originalHash;
      }
      await this.syncManifest(manifest);
    }
  }

  /**
   * Clear user-modified flag for a file
   *
   * @param relativePath - Relative path to file
   */
  async clearUserModified(relativePath: string): Promise<void> {
    const manifest = await this.loadReconciledManifest() ?? this.createEmptyManifest();

    if (manifest.files[relativePath]) {
      manifest.files[relativePath].userModified = false;
      manifest.files[relativePath].originalHash = undefined;
      await this.syncManifest(manifest);
    }
  }

  /**
   * Update file entry in manifest
   *
   * @param relativePath - Relative path to file
   * @param entry - New file entry data
   */
  async updateFileEntry(relativePath: string, entry: Partial<TemplateFileEntry>): Promise<void> {
    const manifest = await this.loadReconciledManifest() ?? this.createEmptyManifest();

    manifest.files[relativePath] = {
      ...manifest.files[relativePath],
      ...entry
    };

    await this.syncManifest(manifest);
  }

  /**
   * Remove file entry from manifest
   *
   * @param relativePath - Relative path to file
   */
  async removeFileEntry(relativePath: string): Promise<void> {
    const manifest = await this.loadReconciledManifest();
    if (!manifest) return;

    delete manifest.files[relativePath];
    await this.syncManifest(manifest);
  }

  /**
   * Get all user-modified files
   *
   * @returns Array of relative paths to user-modified files
   */
  async getUserModifiedFiles(): Promise<string[]> {
    const manifest = await this.loadReconciledManifest();
    if (!manifest) return [];

    return Object.entries(manifest.files)
      .filter(([_, entry]) => entry.userModified)
      .map(([path, _]) => path);
  }

  /**
   * Check if manifest needs update based on version
   *
   * @param currentVersion - Current package version
   * @returns true if manifest is outdated or missing
   */
  async needsUpdate(currentVersion: string): Promise<boolean> {
    const manifest = await this.loadReconciledManifest();
    if (!manifest) return true;

    return manifest.templateVersion !== currentVersion;
  }

  /**
   * Create empty manifest with current versions
   *
   * @param k0ntextVersion - k0ntext package version
   * @param templateVersion - Template version (usually same as k0ntext version)
   * @returns New empty manifest
   */
  createEmptyManifest(
    k0ntextVersion: string = '0.0.0',
    templateVersion: string = '0.0.0'
  ): TemplateManifest {
    return {
      k0ntextVersion,
      templateVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: {}
    };
  }

  /**
   * Validate manifest structure
   *
   * @param manifest - Manifest to validate
   * @throws Error if invalid
   */
  private validateManifest(manifest: unknown): asserts manifest is TemplateManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest: not an object');
    }

    const m = manifest as Partial<TemplateManifest>;

    if (!m.k0ntextVersion || typeof m.k0ntextVersion !== 'string') {
      throw new Error('Invalid manifest: missing or invalid k0ntextVersion');
    }

    if (!m.templateVersion || typeof m.templateVersion !== 'string') {
      throw new Error('Invalid manifest: missing or invalid templateVersion');
    }

    if (!m.createdAt || typeof m.createdAt !== 'string') {
      throw new Error('Invalid manifest: missing or invalid createdAt');
    }

    if (!m.files || typeof m.files !== 'object') {
      throw new Error('Invalid manifest: missing or invalid files');
    }
  }

  /**
   * Get manifest file path for display purposes
   */
  getManifestPath(): string {
    return this.manifestPath;
  }

  /**
   * Check if manifest file exists
   */
  async manifestExists(): Promise<boolean> {
    try {
      await fs.access(this.manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete manifest file (for cleanup/testing)
   */
  async deleteManifest(): Promise<void> {
    try {
      await fs.unlink(this.manifestPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
