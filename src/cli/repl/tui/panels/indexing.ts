/**
 * Indexing Progress Visualization
 *
 * Real-time progress display for indexing operations
 */

import chalk from 'chalk';
import { K0NTEXT_THEME } from '../theme.js';
import ora, { Ora } from 'ora';

/**
 * Indexing progress state
 */
interface IndexingProgress {
  total: number;
  processed: number;
  currentFile?: string;
  stage: 'discovering' | 'indexing_docs' | 'indexing_code' | 'indexing_tools' | 'generating_embeddings' | 'complete';
  startTime: number;
  errors: string[];
}

/**
 * Indexing statistics
 */
interface IndexingStats {
  docsIndexed: number;
  codeIndexed: number;
  configsIndexed: number;
  embeddingsGenerated: number;
  filesSkipped: number;
  duration: number;
}

/**
 * Indexing Progress Visualizer
 */
export class IndexingProgressVisualizer {
  private progress: IndexingProgress;
  private stats: IndexingStats;
  private spinner: Ora | null = null;

  constructor() {
    this.progress = {
      total: 0,
      processed: 0,
      stage: 'discovering',
      startTime: Date.now(),
      errors: []
    };

    this.stats = {
      docsIndexed: 0,
      codeIndexed: 0,
      configsIndexed: 0,
      embeddingsGenerated: 0,
      filesSkipped: 0,
      duration: 0
    };
  }

  /**
   * Start a new indexing operation
   */
  start(totalFiles: number): void {
    this.progress = {
      total: totalFiles,
      processed: 0,
      stage: 'discovering',
      startTime: Date.now(),
      errors: []
    };

    this.stats = {
      docsIndexed: 0,
      codeIndexed: 0,
      configsIndexed: 0,
      embeddingsGenerated: 0,
      filesSkipped: 0,
      duration: 0
    };

    this.spinner = ora('Preparing to index...').start();
  }

  /**
   * Update progress
   */
  update(stage: IndexingProgress['stage'], updates: {
    processed?: number;
    currentFile?: string;
    error?: string;
  }): void {
    this.progress.stage = stage;

    if (updates.processed !== undefined) {
      this.progress.processed = updates.processed;
    }

    if (updates.currentFile) {
      this.progress.currentFile = updates.currentFile;
    }

    if (updates.error) {
      this.progress.errors.push(updates.error);
    }

    this.render();
  }

  /**
   * Render current progress
   */
  private render(): void {
    if (!this.spinner) return;

    const percentage = Math.min(100, Math.round((this.progress.processed / this.progress.total) * 100));
    const elapsed = Date.now() - this.progress.startTime;
    const eta = this.progress.processed > 0
      ? (elapsed / this.progress.processed) * (this.progress.total - this.progress.processed)
      : 0;

    // Update spinner text
    const stageEmoji = {
      discovering: '🔍',
      indexing_docs: '📄',
      indexing_code: '💻',
      indexing_tools: '⚙️',
      generating_embeddings: '🧠',
      complete: '✓'
    }[this.progress.stage];

    let spinnerText = `${stageEmoji} ${this.getStageName(this.progress.stage)}: ${percentage}%`;

    if (this.progress.currentFile) {
      const fileName = this.progress.currentFile.split('/').pop()!;
      spinnerText += ` (${K0NTEXT_THEME.dim(fileName.slice(0, 30))}${this.progress.currentFile.length > 30 ? '...' : ''})`;
    }

    if (eta > 1000) {
      const etaText = this.formatDuration(eta);
      spinnerText += ` ${K0NTEXT_THEME.dim(`ETA: ${etaText}`)}`;
    }

    this.spinner.text = spinnerText;

    // Show detailed progress on intervals
    if (this.progress.processed % 50 === 0 || this.progress.stage === 'complete') {
      this.showDetailedProgress();
    }
  }

  /**
   * Get stage name
   */
  private getStageName(stage: IndexingProgress['stage']): string {
    const names = {
      discovering: 'Discovering files',
      indexing_docs: 'Indexing documents',
      indexing_code: 'Indexing code',
      indexing_tools: 'Indexing configs',
      generating_embeddings: 'Generating embeddings',
      complete: 'Complete'
    };
    return names[stage];
  }

  /**
   * Show detailed progress panel
   */
  showDetailedProgress(): void {
    const lines: string[] = [];

    lines.push('');
    lines.push(K0NTEXT_THEME.header('━━━ Indexing Progress ━━━'));

    // Progress bar
    lines.push(`  Progress: ${this.renderProgressBar()}`);
    lines.push(`  Stage: ${this.getStageName(this.progress.stage)}`);
    lines.push('');

    // Stats
    lines.push(K0NTEXT_THEME.header('━━━ Statistics ━──'));
    lines.push(`  Documents Indexed:  ${K0NTEXT_THEME.cyan(this.stats.docsIndexed.toString())}`);
    lines.push(`  Code Files Indexed:  ${K0NTEXT_THEME.cyan(this.stats.codeIndexed.toString())}`);
    lines.push(`  Configs Indexed:     ${K0NTEXT_THEME.cyan(this.stats.configsIndexed.toString())}`);
    lines.push(`  Embeddings:         ${K0NTEXT_THEME.cyan(this.stats.embeddingsGenerated.toString())}`);
    lines.push(`  Files Skipped:      ${this.stats.filesSkipped > 0 ? K0NTEXT_THEME.warning(this.stats.filesSkipped.toString()) : K0NTEXT_THEME.dim('0')}`);
    lines.push('');

    // Errors
    if (this.progress.errors.length > 0) {
      lines.push(K0NTEXT_THEME.header('━━━ Errors ━──'));
      for (const error of this.progress.errors.slice(-5)) {
        lines.push(`  ${K0NTEXT_THEME.error('✖')} ${error}`);
      }
      lines.push('');
    }

    // Clear and render
    console.log(lines.join('\n'));
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): string {
    const percentage = Math.min(100, Math.round((this.progress.processed / this.progress.total) * 100));
    const width = 30;
    const filled = Math.floor((percentage / 100) * width);

    const bar = K0NTEXT_THEME.primary('█'.repeat(filled)) + K0NTEXT_THEME.dim('░'.repeat(width - filled));
    const pct = K0NTEXT_THEME.primary(`${percentage.toString().padStart(3)}%`);
    const counts = `${this.progress.processed}/${this.progress.total}`;

    return `${bar} ${pct} (${K0NTEXT_THEME.dim(counts)})`;
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Complete indexing
   */
  complete(stats: Partial<IndexingStats>): void {
    this.progress.stage = 'complete';
    this.progress.processed = this.progress.total;

    this.stats = {
      docsIndexed: stats.docsIndexed || 0,
      codeIndexed: stats.codeIndexed || 0,
      configsIndexed: stats.configsIndexed || 0,
      embeddingsGenerated: stats.embeddingsGenerated || 0,
      filesSkipped: stats.filesSkipped || 0,
      duration: Date.now() - this.progress.startTime
    };

    if (this.spinner) {
      this.spinner.succeed('Indexing complete!');
    }

    this.showFinalStats();
  }

  /**
   * Show final statistics
   */
  showFinalStats(): void {
    const lines: string[] = [];

    lines.push('');
    lines.push(K0NTEXT_THEME.success('━━━ Indexing Complete ━━━'));
    lines.push('');

    lines.push(`  ${K0NTEXT_THEME.header('Files Processed:')}`);
    lines.push(`    Documents:    ${K0NTEXT_THEME.cyan(this.stats.docsIndexed.toString())}`);
    lines.push(`    Code Files:   ${K0NTEXT_THEME.cyan(this.stats.codeIndexed.toString())}`);
    lines.push(`    Configs:      ${K0NTEXT_THEME.cyan(this.stats.configsIndexed.toString())}`);
    lines.push(`    Total:        ${K0NTEXT_THEME.primary((this.stats.docsIndexed + this.stats.codeIndexed + this.stats.configsIndexed).toString())}`);
    lines.push('');

    if (this.stats.embeddingsGenerated > 0) {
      lines.push(`  ${K0NTEXT_THEME.header('Embeddings:')}`);
      lines.push(`    Generated:   ${K0NTEXT_THEME.cyan(this.stats.embeddingsGenerated.toString())}`);
      lines.push('');
    }

    if (this.stats.filesSkipped > 0) {
      lines.push(`  ${K0NTEXT_THEME.warning('⚠ Files Skipped:')}`);
      lines.push(`    ${this.stats.filesSkipped} files hit limit (use --max-files to increase)`);
      lines.push('');
    }

    lines.push(`  ${K0NTEXT_THEME.header('Time:')}`);
    lines.push(`    Duration:    ${K0NTEXT_THEME.formatTimestamp(new Date(Date.now() - this.stats.duration))}`);
    lines.push('');

    console.log(lines.join('\n'));
  }

  /**
   * Cancel indexing
   */
  cancel(): void {
    if (this.spinner) {
      this.spinner.warn('Indexing cancelled');
    }

    console.log('');
    console.log(K0NTEXT_THEME.info('Indexing was cancelled.'));
    console.log(K0NTEXT_THEME.dim('Partial results may have been saved.'));
  }

  /**
   * Format a timestamp relative to now
   */
  private formatTimestamp(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s ago`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    } else {
      return `${seconds}s ago`;
    }
  }
}
