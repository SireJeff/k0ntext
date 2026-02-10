/**
 * Template Sync Module
 *
 * Exports all components for template synchronization.
 */

export { TemplateSyncEngine } from './engine.js';
export { TemplateScanner } from './scanner.js';
export { TemplateHasher } from './hasher.js';
export { TemplateComparator } from './comparator.js';
export { TemplateMerger } from './merger.js';
export { ConflictResolver } from './conflict-resolver.js';
export { TemplateManifestManager } from './manifest.js';

export type {
  TemplateFile,
  TemplateManifest,
  TemplateFileEntry,
  FileComparison,
  FileState,
  SyncResult,
  SyncOptions,
  TemplateSubdir,
  ExcludedSubdir,
  TemplateSource,
  MergeResult,
  MergeMethod,
  ResolutionChoice,
  ResolutionResult,
  ArchiveResult,
  TemplateFileRecord,
  TemplateManifestRecord
} from './types.js';

export {
  TEMPLATE_SUBDIRS,
  EXCLUDED_SUBDIRS,
  DEFAULT_SYNC_OPTIONS
} from './types.js';

export type {
  ScanResult
} from './scanner.js';

export type {
  BatchStrategy
} from './conflict-resolver.js';

export type {
  ComparisonOptions,
  ComparisonResult
} from './comparator.js';

export type {
  MergerOptions
} from './merger.js';

export type {
  ResolutionOptions
} from './conflict-resolver.js';
