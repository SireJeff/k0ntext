import fs from 'fs';
import path from 'path';
import { DEFAULT_CLEANUP_CONFIG } from '../config/cleanup-config.js';

export interface CleanupOptions {
  dryRun?: boolean;
  keep?: string[];
  verbose?: boolean;
  cwd?: string;
}

export interface CleanupConfig {
  /** Default dry run mode (safe mode) */
  dryRun: boolean;

  /** Default folders to keep */
  defaultKeep: string[];

  /** Verbose output by default */
  verbose: boolean;

  /** Maximum folder depth to scan */
  maxDepth: number;

  /** Timeout for folder operations in milliseconds */
  timeout: number;

  /** Default working directory */
  cwd: string;
}

export interface CleanupResult {
  scanned: number;
  removed: string[];
  kept: string[];
  errors: Array<{ folder: string; error: unknown }>;
}

export class CleanupAgent {
  private readonly KNOWN_TOOL_FOLDERS = [
    '.cursor', '.windsurf', '.cline', '.aider',
    '.continue', '.copilot', '.cursorrules',
    '.ai-context', // legacy
    '.github', '.vscode', '.idea', '.devcontainer'
  ];

  private config: typeof DEFAULT_CLEANUP_CONFIG;

  constructor(config?: Partial<typeof DEFAULT_CLEANUP_CONFIG>) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config, cwd: config?.cwd || process.cwd() };
  }

  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const cwd = options.cwd || this.config.cwd;
    const entries = fs.readdirSync(cwd, { withFileTypes: true });

    const allToolFolders = entries
      .filter(e => e.isDirectory() && e.name.startsWith('.'))
      .filter(e => this.KNOWN_TOOL_FOLDERS.includes(e.name));

    // Separate folders to remove vs folders to keep
    const keepList = [
      ...(options.keep || []),
      ...this.config.defaultKeep
    ];

    const foldersToRemove = allToolFolders.filter(e => !keepList.includes(e.name));
    const foldersToKeep = allToolFolders.filter(e => keepList.includes(e.name));

    const results: CleanupResult = {
      scanned: allToolFolders.length,
      removed: [],
      kept: foldersToKeep.map(f => f.name),
      errors: [],
    };

    for (const folder of foldersToRemove) {
      try {
        const folderPath = path.join(cwd, folder.name);

        if (options.dryRun || this.config.dryRun) {
          results.removed.push(folder.name + ' (dry-run)');
          if (options.verbose || this.config.verbose) console.log(`Would remove: ${folder.name}`);
        } else {
          fs.rmSync(folderPath, { recursive: true, force: true });
          results.removed.push(folder.name);
          if (options.verbose || this.config.verbose) console.log(`Removed: ${folder.name}`);
        }
      } catch (error) {
        results.errors.push({ folder: folder.name, error });
      }
    }

    // Log kept folders in verbose mode
    if ((options.verbose || this.config.verbose) && foldersToKeep.length > 0) {
      for (const folder of foldersToKeep) {
        console.log(`Kept: ${folder.name} (preserved)`);
      }
    }

    return results;
  }

  async analyze(options: Omit<CleanupOptions, 'dryRun'> = {}): Promise<CleanupResult> {
    return this.cleanup({ ...options, dryRun: true, verbose: true });
  }

  getConfig(): typeof DEFAULT_CLEANUP_CONFIG {
    return { ...this.config };
  }
}