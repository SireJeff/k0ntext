/**
 * Drift Detection Panel
 *
 * Enhanced drift detection with detailed analysis and visualization
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { K0NTEXT_THEME } from '../theme.js';
import { DatabaseClient } from '../../../../db/client.js';

/**
 * Drift type
 */
export type DriftType = 'file_dates' | 'structure' | 'git_diff';

/**
 * Drift severity
 */
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * File drift information
 */
interface FileDrift {
  filePath: string;
  fileType: 'doc' | 'code' | 'config';
  lastModified: Date;
  lastIndexed: Date;
  daysSince: number;
  severity: DriftSeverity;
}

/**
 * Structure drift information
 */
interface StructureDrift {
  addedFiles: string[];
  removedFiles: string[];
  severity: DriftSeverity;
}

/**
 * Git drift information
 */
interface GitDrift {
  committedChanges: number;
  uncommittedChanges: string[];
  severity: DriftSeverity;
}

/**
 * Combined drift report
 */
export interface DriftReport {
  fileDrifts: FileDrift[];
  structureDrift: StructureDrift | null;
  gitDrift: GitDrift | null;
  overallSeverity: DriftSeverity;
  summary: string;
}

/**
 * Drift Detection Panel
 */
export class DriftDetectionPanel {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run complete drift analysis
   */
  async analyze(): Promise<DriftReport> {
    const [fileDrifts, structureDrift, gitDrift] = await Promise.all([
      this.analyzeFileDates(),
      this.analyzeStructure(),
      this.analyzeGitDiff()
    ]);

    // Determine overall severity
    const severities: DriftSeverity[] = [
      this.getDriftSeverity(fileDrifts),
      structureDrift?.severity || 'low',
      gitDrift?.severity || 'low'
    ];

    const overallSeverity: DriftSeverity = severities.includes('critical')
      ? 'critical'
      : severities.includes('high')
        ? 'high'
        : severities.includes('medium')
          ? 'medium'
          : 'low';

    const summary = this.generateSummary(fileDrifts, structureDrift, gitDrift);

    return {
      fileDrifts,
      structureDrift,
      gitDrift,
      overallSeverity,
      summary
    };
  }

  /**
   * Analyze file date drifts
   */
  private async analyzeFileDates(): Promise<FileDrift[]> {
    const drifts: FileDrift[] = [];
    const thresholdDays = 7; // Files not updated in 7 days are considered drifted

    try {
      const db = new DatabaseClient(this.projectRoot);
      const items = db.getAllItems();

      const now = new Date();

      for (const item of items) {
        if (!item.updatedAt) continue;

        const lastIndexed = new Date(item.updatedAt);
        const daysSince = Math.floor((now.getTime() - lastIndexed.getTime()) / (1000 * 60 * 60 * 24));

        // Only include items that are drifted (> 7 days old)
        if (daysSince <= thresholdDays) continue;

        // Determine file type from item type
        let fileType: 'doc' | 'code' | 'config' = 'doc';
        if (item.type === 'code' || item.type === 'command' || item.type === 'commit') {
          fileType = 'code';
        } else if (item.type === 'config' || item.type === 'tool_config') {
          fileType = 'config';
        } else {
          fileType = 'doc';
        }

        // Determine severity based on days since update
        let severity: DriftSeverity = 'medium';
        if (daysSince > 30) {
          severity = 'critical';
        } else if (daysSince > 14) {
          severity = 'high';
        } else {
          severity = 'medium';
        }

        drifts.push({
          filePath: item.filePath || item.id,
          fileType,
          lastModified: lastIndexed,
          lastIndexed,
          daysSince,
          severity
        });
      }

      db.close();
    } catch (error) {
      // If database is not available, return empty array
      console.error('Failed to analyze file dates:', error);
    }

    return drifts;
  }

  /**
   * Analyze structure changes
   */
  private async analyzeStructure(): Promise<StructureDrift | null> {
    const addedFiles: string[] = [];
    const removedFiles: string[] = [];

    // Check for .k0ntext directory
    const k0ntextDir = path.join(this.projectRoot, '.k0ntext');
    if (!fs.existsSync(k0ntextDir)) {
      return null;
    }

    // Could scan for untracked files
    // This is a simplified implementation

    let severity: DriftSeverity = 'low';
    const totalChanges = addedFiles.length + removedFiles.length;

    if (totalChanges > 50) severity = 'critical';
    else if (totalChanges > 20) severity = 'high';
    else if (totalChanges > 5) severity = 'medium';

    return {
      addedFiles,
      removedFiles,
      severity
    };
  }

  /**
   * Analyze git diff for changes
   */
  private async analyzeGitDiff(): Promise<GitDrift | null> {
    const gitDir = path.join(this.projectRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return null;
    }

    // Check for uncommitted changes
    const uncommittedChanges: string[] = [];

    try {
      // Use git diff to check for changes

      // Check for modified files
      const modified = execSync('git diff --name-only', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe'
      }) as string;

      if (modified.trim()) {
        uncommittedChanges.push(...modified.trim().split('\n').filter(Boolean));
      }

      // Check for untracked files
      const untracked = execSync('git ls-files --others --exclude-standard', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe'
      }) as string;

      if (untracked.trim()) {
        uncommittedChanges.push(...untracked.trim().split('\n').filter(Boolean));
      }

      // Get commit count
      const commitCountStr = execSync('git rev-list --count HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe'
      }) as string;

      const commitCount = parseInt(commitCountStr.trim() || '0');

      let severity: DriftSeverity = 'low';
      const totalChanges = uncommittedChanges.length;

      if (totalChanges > 20) severity = 'critical';
      else if (totalChanges > 10) severity = 'high';
      else if (totalChanges > 5) severity = 'medium';

      return {
        committedChanges: commitCount,
        uncommittedChanges,
        severity
      };
    } catch {
      // Git not available or error
      return null;
    }
  }

  /**
   * Get drift severity from file drifts
   */
  private getDriftSeverity(drifts: FileDrift[]): DriftSeverity {
    if (drifts.length === 0) return 'low';

    const criticalDrifts = drifts.filter(d => d.severity === 'critical').length;
    const highDrifts = drifts.filter(d => d.severity === 'high').length;
    const mediumDrifts = drifts.filter(d => d.severity === 'medium').length;

    if (criticalDrifts > 5) return 'critical';
    if (criticalDrifts > 2 || highDrifts > 10) return 'high';
    if (mediumDrifts > 10 || highDrifts > 3) return 'medium';
    return 'low';
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    fileDrifts: FileDrift[],
    structureDrift: StructureDrift | null,
    gitDrift: GitDrift | null
  ): string {
    const parts: string[] = [];

    const fileCount = fileDrifts.length;
    const structChanges = structureDrift ? structureDrift.addedFiles.length + structureDrift.removedFiles.length : 0;
    const gitChanges = gitDrift ? gitDrift.uncommittedChanges.length : 0;

    if (fileCount === 0 && structChanges === 0 && gitChanges === 0) {
      return 'All context files are up to date with your codebase.';
    }

    if (fileCount > 0) {
      parts.push(`${fileCount} files may be outdated`);
    }

    if (structChanges > 0) {
      parts.push(`${structChanges} structural changes detected`);
    }

    if (gitChanges > 0) {
      parts.push(`${gitChanges} uncommitted changes`);
    }

    return parts.join(', ') || 'No drift detected';
  }

  /**
   * Display drift report
   */
  displayReport(report: DriftReport): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(K0NTEXT_THEME.header('━━━ Documentation Drift Analysis ━━━'));
    lines.push('');

    // Overall severity
    const severityEmoji = {
      critical: K0NTEXT_THEME.error('🔴 Critical'),
      high: K0NTEXT_THEME.warning('🟠 High'),
      medium: K0NTEXT_THEME.warning('🟡 Medium'),
      low: K0NTEXT_THEME.success('🟢 Good')
    }[report.overallSeverity];

    lines.push(`  Overall Status:  ${severityEmoji}`);
    lines.push(`  Summary:         ${report.summary}`);
    lines.push('');

    // File drifts
    if (report.fileDrifts.length > 0) {
      lines.push(K0NTEXT_THEME.header('━━━ File Date Drifts ━──'));

      const bySeverity = this.groupBySeverity(report.fileDrifts);

      for (const [severity, drifts] of Object.entries(bySeverity)) {
        if (drifts.length === 0) continue;

        const severityLabel = {
          critical: '🔴 Critical',
          high: '🟠 High',
          medium: '🟡 Medium',
          low: '🟢 Low'
        }[severity as DriftSeverity];

        lines.push(`  ${severityLabel} (${drifts.length} files):`);

        for (const drift of drifts.slice(0, 5)) {
          const icon = this.getFileTypeIcon(drift.fileType);
          const days = drift.daysSince;
          lines.push(`    ${icon} ${K0NTEXT_THEME.dim(drift.filePath)}`);
          lines.push(`       ${K0NTEXT_THEME.dim(`not updated in ${days} days`)}`);
        }

        if (drifts.length > 5) {
          lines.push(`    ${K0NTEXT_THEME.dim(`... and ${drifts.length - 5} more`)}`);
        }

        lines.push('');
      }
    }

    // Structure drifts
    if (report.structureDrift) {
      lines.push(K0NTEXT_THEME.header('━━━ Structure Changes ━──'));

      if (report.structureDrift.addedFiles.length > 0) {
        lines.push(`  ${K0NTEXT_THEME.success('+')} New files: ${report.structureDrift.addedFiles.length}`);
        for (const file of report.structureDrift.addedFiles.slice(0, 5)) {
          lines.push(`    ${K0NTEXT_THEME.dim(file)}`);
        }
        if (report.structureDrift.addedFiles.length > 5) {
          lines.push(`    ${K0NTEXT_THEME.dim('... and more')}`);
        }
        lines.push('');
      }

      if (report.structureDrift.removedFiles.length > 0) {
        lines.push(`  ${K0NTEXT_THEME.error('-')} Removed files: ${report.structureDrift.removedFiles.length}`);
        for (const file of report.structureDrift.removedFiles.slice(0, 5)) {
          lines.push(`    ${K0NTEXT_THEME.dim(file)}`);
        }
        if (report.structureDrift.removedFiles.length > 5) {
          lines.push(`    ${K0NTEXT_THEME.dim('... and more')}`);
        }
        lines.push('');
      }
    }

    // Git drifts
    if (report.gitDrift) {
      lines.push(K0NTEXT_THEME.header('━━━ Git Changes ━──'));

      if (report.gitDrift.uncommittedChanges.length > 0) {
        lines.push(`  Uncommitted changes: ${report.gitDrift.uncommittedChanges.length}`);

        for (const file of report.gitDrift.uncommittedChanges.slice(0, 5)) {
          const status = file.includes('(new file)') ? 'new' : 'modified';
          const statusIcon = status === 'new' ? K0NTEXT_THEME.success('+') : K0NTEXT_THEME.warning('~');
          lines.push(`    ${statusIcon} ${K0NTEXT_THEME.dim(file)}`);
        }
        if (report.gitDrift.uncommittedChanges.length > 5) {
          lines.push(`    ${K0NTEXT_THEME.dim('... and more')}`);
        }
        lines.push('');
      }
    }

    // Recommendations
    lines.push(K0NTEXT_THEME.header('━━━ Recommendations ━━━'));

    if (report.overallSeverity === 'critical' || report.overallSeverity === 'high') {
      lines.push(`  ${K0NTEXT_THEME.warning('⚠ Urgent action recommended:')}`);
      lines.push(`    ${K0NTEXT_THEME.cyan('•')} Run ${K0NTEXT_THEME.highlight('index')} to update your context`);
      lines.push(`    ${K0NTEXT_THEME.cyan('•')} Commit your changes to keep tracking in sync`);
    } else if (report.overallSeverity === 'medium') {
      lines.push(`  ${K0NTEXT_THEME.info('ℹ Consider updating soon:')}`);
      lines.push(`    ${K0NTEXT_THEME.cyan('•')} Run ${K0NTEXT_THEME.highlight('index')} to refresh context`);
    } else {
      lines.push(`  ${K0NTEXT_THEME.success('✓ Your context is up to date!')}`);
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Group drifts by severity
   */
  private groupBySeverity(drifts: FileDrift[]): Record<string, FileDrift[]> {
    return {
      critical: drifts.filter(d => d.severity === 'critical'),
      high: drifts.filter(d => d.severity === 'high'),
      medium: drifts.filter(d => d.severity === 'medium'),
      low: drifts.filter(d => d.severity === 'low')
    };
  }

  /**
   * Get file type icon
   */
  private getFileTypeIcon(type: 'doc' | 'code' | 'config'): string {
    const icons = {
      doc: '📄',
      code: '💻',
      config: '⚙️'
    };
    return icons[type] || '📄';
  }
}
