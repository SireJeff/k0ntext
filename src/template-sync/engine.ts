/**
 * Template Sync Engine
 *
 * Main orchestrator for template synchronization.
 * Coordinates comparison, merging, conflict resolution, and manifest updates.
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import path from 'path';
import { promises as fs, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { DatabaseClient } from '../db/client.js';
import { BackupManager } from '../cli/utils/backup-manager.js';
import { TemplateScanner } from './scanner.js';
import { TemplateComparator } from './comparator.js';
import { TemplateMerger } from './merger.js';
import { ConflictResolver } from './conflict-resolver.js';
import { TemplateManifestManager } from './manifest.js';
import { TemplateHasher } from './hasher.js';
import type { SyncResult, SyncOptions, TemplateSubdir, FileComparison, ArchiveResult } from './types.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main template sync orchestrator
 */
export class TemplateSyncEngine {
  private manifestManager: TemplateManifestManager;
  private backupManager: BackupManager;
  private readonly packageVersion: string;

  constructor(
    private db: DatabaseClient,
    private projectRoot: string = process.cwd(),
    private templateRoot: string = path.resolve(__dirname, '../../templates/base')
  ) {
    this.manifestManager = new TemplateManifestManager(db, projectRoot);
    this.backupManager = new BackupManager(db, projectRoot);
    this.packageVersion = this.getPackageVersion();
  }

  /**
   * Execute full sync operation
   *
   * @param options - Sync options
   * @returns Sync result
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const spinner = ora('Preparing template sync...').start();

    try {
      // Step 1: Compare templates
      spinner.text = 'Comparing templates...';
      const comparator = new TemplateComparator(this.db, this.projectRoot, this.templateRoot, options.verbose);
      const comparisonResult = await comparator.compare({
        subdirectories: options.subdirectories,
        checkUserModifications: true,
        verbose: options.verbose
      });

      const comparisons = comparisonResult.comparisons;

      if (options.dryRun) {
        spinner.stop();
        this.showDryRunResults(comparisons, options.verbose);
        return {
          total: comparisons.length,
          updated: 0,
          skipped: comparisons.map(c => c.path),
          created: 0,
          conflicts: comparisons.filter(c => c.state === 'conflict'),
          userOnly: [],
          durationMs: Date.now() - startTime,
          dryRun: true
        };
      }

      // Step 2: Separate into categories
      const safeUpdates = TemplateComparator.getSafeUpdates(comparisons);
      const conflicts = TemplateComparator.getConflicts(comparisons);
      const userOnly = comparisons.filter(c => c.state === 'user-only');

      // Step 3: Auto-merge safe updates
      spinner.text = `Auto-merging ${safeUpdates.length} safe update(s)...`;
      const merger = new TemplateMerger(this.projectRoot, this.templateRoot, {
        createBackups: true,
        generateDiffs: options.verbose
      });

      const mergeResults = await merger.mergeFiles(safeUpdates);
      const stats = TemplateMerger.getStatistics(mergeResults);

      // Step 4: Handle conflicts
      const conflictResolutions = new Map<string, 'keep-local' | 'overwrite'>();
      let resolvedConflicts: FileComparison[] = [];

      if (conflicts.length > 0 && !options.force) {
        spinner.stop();
        const resolver = new ConflictResolver(this.projectRoot, this.templateRoot);
        const resolutions = await resolver.resolveConflicts(conflicts);

        for (const resolution of resolutions) {
          if (resolution.choice === 'overwrite' || resolution.choice === 'keep-local') {
            conflictResolutions.set(resolution.path, resolution.choice);
          }
        }

        // Apply overwrite resolutions
        if (conflictResolutions.size > 0) {
          spinner.start('Applying conflict resolutions...');
          const applied = await resolver.applyResolutions(
            resolutions.map(r => ({ path: r.path, choice: r.choice })),
            conflicts
          );

          resolvedConflicts = Array.from(conflictResolutions.keys())
            .map(path => conflicts.find(c => c.path === path)!)
            .filter(Boolean);

          spinner.succeed(`Applied ${applied.applied} resolution(s)`);
        } else {
          spinner.start('Continuing sync...');
        }
      } else if (conflicts.length > 0 && options.force) {
        // Force: overwrite all conflicts
        spinner.stop();
        const resolver = new ConflictResolver(this.projectRoot, this.templateRoot);

        // Mark all conflicts for overwrite
        const resolutions = conflicts.map(conflict => ({
          path: conflict.path,
          choice: 'overwrite' as const
        }));

        // Also update the conflictResolutions map for proper return value
        for (const conflict of conflicts) {
          conflictResolutions.set(conflict.path, 'overwrite');
        }

        // Apply the overwrites
        spinner.start('Applying forced overwrites...');
        const applied = await resolver.applyResolutions(resolutions, conflicts);

        resolvedConflicts = conflicts;
        spinner.succeed(`Applied ${applied.applied} forced overwrite(s)`);
        spinner.start('Continuing sync...');
      }

      // Step 5: Archive removed files if enabled
      let archived: string[] = [];
      if (options.archiveRemoved && userOnly.length > 0) {
        spinner.text = 'Archiving removed files...';
        archived = await this.archiveRemovedFiles(userOnly.map(f => f.path));
      }

      // Step 6: Update manifest
      spinner.text = 'Updating manifest...';
      await this.updateManifest(comparisons);

      // Step 7: Update user-modified flags in database
      await this.updateUserModifiedFlags(comparisons);

      const skipped = [
        ...comparisons.filter(c => c.state === 'identical').map(c => c.path),
        ...Array.from(conflictResolutions.entries())
          .filter(([_, choice]) => choice === 'keep-local')
          .map(([path, _]) => path)
      ];

      spinner.succeed(chalk.green('Template sync complete'));

      return {
        total: comparisons.length,
        updated: stats.successful,
        skipped,
        created: stats.byMethod['auto-create'],
        conflicts: comparisons.filter(c => c.state === 'conflict' && !conflictResolutions.has(c.path)),
        userOnly: userOnly.map(f => f.path),
        durationMs: Date.now() - startTime
      };

    } catch (error) {
      spinner.fail(chalk.red('Template sync failed'));
      throw error;
    }
  }

  /**
   * Update manifest after sync
   *
   * @param comparisons - File comparisons
   */
  private async updateManifest(comparisons: FileComparison[]): Promise<void> {
    // Get or create manifest
    let manifest = await this.manifestManager.loadReconciledManifest();
    if (!manifest) {
      manifest = this.manifestManager.createEmptyManifest(
        this.packageVersion,
        this.packageVersion
      );
    } else {
      // Update versions
      manifest.k0ntextVersion = this.packageVersion;
      manifest.templateVersion = this.packageVersion;
    }

    const templateBasePath = this.templateRoot;

    // Update file entries
    for (const comparison of comparisons) {
      if (comparison.state === 'user-only' || comparison.state === 'deleted') {
        // Skip user-only files or deleted files
        continue;
      }

      const templatePath = path.join(templateBasePath, comparison.path);
      const hash = await TemplateHasher.hashFileSafe(templatePath);

      // Get existing entry to preserve userModified flag
      const existingEntry = manifest.files[comparison.path];
      const userModified = existingEntry?.userModified ?? comparison.userModified;

      manifest.files[comparison.path] = {
        hash,
        templateVersion: this.packageVersion,
        userModified,
        lastSyncedAt: new Date().toISOString(),
        originalHash: userModified ? existingEntry?.originalHash : undefined
      };
    }

    await this.manifestManager.syncManifest(manifest, 'db');
  }

  /**
   * Update user-modified flags in database
   *
   * @param comparisons - File comparisons
   */
  private async updateUserModifiedFlags(comparisons: FileComparison[]): Promise<void> {
    for (const comparison of comparisons) {
      if (comparison.userModified && comparison.state === 'conflict') {
        await this.manifestManager.markUserModified(
          comparison.path,
          comparison.originalHash
        );
      }
    }
  }

  /**
   * Archive removed files
   *
   * @param filePaths - Relative paths to files
   * @returns Array of archived file paths
   */
  private async archiveRemovedFiles(filePaths: string[]): Promise<string[]> {
    const archiveDir = path.join(this.projectRoot, '.k0ntext', 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archived: string[] = [];

    for (const relativePath of filePaths) {
      const localPath = path.join(this.projectRoot, '.claude', relativePath);

      try {
        const archivePath = path.join(
          archiveDir,
          `${relativePath}.${timestamp}.archived`
        );

        await fs.mkdir(path.dirname(archivePath), { recursive: true });
        await fs.copyFile(localPath, archivePath);
        await fs.unlink(localPath);

        archived.push(relativePath);
      } catch (error) {
        // File might not exist, skip
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Warning: Could not archive ${relativePath}: ${error}`);
        }
      }
    }

    return archived;
  }

  /**
   * Check if sync is needed
   *
   * @returns true if templates need updating
   */
  async needsSync(): Promise<boolean> {
    // First check if package version has changed
    const versionChanged = await this.manifestManager.needsUpdate(this.packageVersion);
    if (versionChanged) {
      return true;
    }

    // Even if version hasn't changed, check for user modifications or conflicts
    // This ensures we detect files modified after initial sync
    try {
      const comparator = new TemplateComparator(this.db, this.projectRoot, this.templateRoot, false);
      const comparisonResult = await comparator.compare({
        checkUserModifications: true
      });

      // Check if there are any actionable files (conflicts, safe updates, or new files)
      const actionableFiles = TemplateComparator.getActionableComparisons(comparisonResult.comparisons);
      const conflicts = TemplateComparator.getConflicts(comparisonResult.comparisons);

      // Need sync if there are conflicts (user-modified files) or other actionable items
      return actionableFiles.length > 0 || conflicts.length > 0;
    } catch {
      // If comparison fails, assume sync is needed to be safe
      return true;
    }
  }

  /**
   * Get current manifest
   *
   * @returns Current manifest or null
   */
  async getManifest(): Promise<Awaited<ReturnType<TemplateManifestManager['loadReconciledManifest']>>> {
    return await this.manifestManager.loadReconciledManifest();
  }

  /**
   * Get template version from package
   *
   * @returns Package version string
   */
  private getPackageVersion(): string {
    try {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Get template root path
   */
  getTemplateRoot(): string {
    return this.templateRoot;
  }

  /**
   * Get project root path
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Show dry run results
   *
   * @param comparisons - File comparisons
   * @param verbose - Whether to show verbose output
   */
  private showDryRunResults(comparisons: FileComparison[], verbose: boolean = false): void {
    const resolver = new ConflictResolver(this.projectRoot, this.templateRoot);
    resolver.showDryRunResults(comparisons);

    if (verbose) {
      console.log(chalk.bold('\nVerbose Details:\n'));

      for (const comparison of comparisons) {
        console.log(chalk.cyan(`${comparison.path}`));
        console.log(chalk.dim(`  State: ${comparison.state}`));
        console.log(chalk.dim(`  Template hash: ${comparison.templateHash}`));
        console.log(chalk.dim(`  Local hash: ${comparison.localHash}`));
        if (comparison.userModified) {
          console.log(chalk.yellow(`  User modified: Yes`));
        }
        if (comparison.originalHash) {
          console.log(chalk.dim(`  Original hash: ${comparison.originalHash}`));
        }
        console.log('');
      }
    }
  }

  /**
   * Get sync status summary
   *
   * @returns Status summary
   */
  async getStatusSummary(): Promise<{
    manifestExists: boolean;
    templateVersion: string | null;
    currentVersion: string;
    needsUpdate: boolean;
    userModifiedFiles: string[];
  }> {
    const manifest = await this.manifestManager.loadReconciledManifest();
    const manifestExists = await this.manifestManager.manifestExists();
    const userModifiedFiles = await this.manifestManager.getUserModifiedFiles();
    const needsUpdate = await this.manifestManager.needsUpdate(this.packageVersion);

    return {
      manifestExists,
      templateVersion: manifest?.templateVersion ?? null,
      currentVersion: this.packageVersion,
      needsUpdate,
      userModifiedFiles
    };
  }
}
