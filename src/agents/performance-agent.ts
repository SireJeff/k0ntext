/**
 * Performance Monitor Agent
 *
 * Monitors database performance, query times, and system metrics.
 */

import { DatabaseClient } from '../db/client.js';

export interface PerformanceMetrics {
  queryCount: number;
  avgQueryTime: number;
  slowQueries: number;
  databaseSize: number;
  indexUsage: number;
  cacheHitRate: number;
}

export class PerformanceMonitorAgent {
  private db: DatabaseClient;
  private queryTimes: number[] = [];
  private slowQueryThreshold = 1000; // ms

  constructor(projectRoot: string) {
    this.db = new DatabaseClient(projectRoot);
  }

  /**
   * Track query execution time
   */
  trackQuery(durationMs: number): void {
    this.queryTimes.push(durationMs);

    // Keep only last 100 queries
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgQueryTime = this.queryTimes.length > 0
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
      : 0;

    const slowQueries = this.queryTimes.filter(t => t > this.slowQueryThreshold).length;

    // Get database size
    const dbPath = this.db.getPath();
    let databaseSize = 0;
    try {
      const fs = require('fs');
      databaseSize = fs.statSync(dbPath).size;
    } catch {
      // File doesn't exist or can't be read
    }

    return {
      queryCount: this.queryTimes.length,
      avgQueryTime,
      slowQueries,
      databaseSize,
      indexUsage: 0, // Would need PRAGMA stats
      cacheHitRate: 0  // Would need cache tracking
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();

    let report = 'Performance Report\n';
    report += '==================\n\n';
    report += `Query Count: ${metrics.queryCount}\n`;
    report += `Avg Query Time: ${metrics.avgQueryTime.toFixed(2)}ms\n`;
    report += `Slow Queries: ${metrics.slowQueries}\n`;
    report += `Database Size: ${(metrics.databaseSize / 1024).toFixed(2)} KB\n\n`;

    if (metrics.slowQueries > 0) {
      report += '⚠ Warning: Slow queries detected. Consider adding indexes.\n';
    }

    return report;
  }

  /**
   * Suggest optimizations
   */
  suggestOptimizations(): string[] {
    const suggestions: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.avgQueryTime > 500) {
      suggestions.push('Consider adding indexes for frequently queried columns');
    }

    if (metrics.databaseSize > 10 * 1024 * 1024) { // 10 MB
      suggestions.push('Database is large. Consider running VACUUM to reclaim space');
    }

    if (metrics.slowQueries > 0) {
      suggestions.push('Review slow queries and optimize with proper indexes');
    }

    return suggestions;
  }

  close(): void {
    this.db.close();
  }
}
