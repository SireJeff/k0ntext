/**
 * Database Client
 * 
 * SQLite database operations for AI context storage.
 * Handles CRUD operations, queries, and vector search.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  SCHEMA_SQL,
  VECTOR_SCHEMA_SQL,
  TEMPLATE_SCHEMA_SQL,
  SCHEMA_VERSION,
  type ContextType,
  type RelationType,
  type SyncStatus,
  type AITool
} from './schema.js';

/**
 * Context item structure
 */
export interface ContextItem {
  id: string;
  type: ContextType;
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
  filePath?: string;
  contentHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Knowledge graph edge
 */
export interface GraphEdge {
  id?: number;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  weight?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Git commit record
 */
export interface GitCommit {
  sha: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  timestamp: string;
  filesChanged?: string[];
  stats?: { additions: number; deletions: number };
}

/**
 * Sync state record
 */
export interface SyncState {
  id: string;
  tool: string;
  contentHash?: string;
  lastSync: string;
  filePath?: string;
  status: SyncStatus;
  metadata?: Record<string, unknown>;
  k0ntextVersion?: string;
  userModified?: number;
  lastChecked?: string;
}

/**
 * AI tool configuration record
 */
export interface AIToolConfig {
  id: string;
  toolName: AITool;
  configPath: string;
  content: string;
  contentHash?: string;
  lastSync: string;
  status: SyncStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Version tracking record
 */
export interface VersionTracking {
  tool: string;
  k0ntextVersion: string;
  userModified?: boolean;
  lastChecked?: string;
  filePath?: string;
  contentHash?: string;
}

/**
 * Generated file record
 */
export interface GeneratedFile {
  id: string;
  tool: string;
  filePath: string;
  contentHash: string;
  backupPath?: string;
  generatedAt: string;
  lastVerifiedAt?: string;
  userModified: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  item: ContextItem;
  similarity: number;
}

/**
 * Database client for AI context storage
 */
export class DatabaseClient {
  private db: Database.Database;
  private dbPath: string;

  constructor(projectRoot: string, dbFileName = '.k0ntext.db') {
    this.dbPath = path.join(projectRoot, dbFileName);
    
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Load sqlite-vec extension
    sqliteVec.load(this.db);
    
    // Initialize schema
    this.initSchema();
  }

  /**
   * Migrate legacy database
   */
  private migrateLegacyDatabase(): void {
    const legacyPath = path.join(process.cwd(), '.ai-context.db');
    const newPath = this.dbPath;

    if (fs.existsSync(legacyPath) && !fs.existsSync(newPath)) {
      fs.copyFileSync(legacyPath, newPath);
      console.log(`✓ Migrated .ai-context.db to .k0ntext.db`);
    }
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    // Migrate legacy database first
    this.migrateLegacyDatabase();

    // Create core tables
    this.db.exec(SCHEMA_SQL);

    // Create vector table
    this.db.exec(VECTOR_SCHEMA_SQL);

    // Create template sync tables
    this.db.exec(TEMPLATE_SCHEMA_SQL);

    // Record schema version
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO schema_version (version, applied_at)
      VALUES (?, datetime('now'))
    `);
    stmt.run(SCHEMA_VERSION);
  }

  /**
   * Execute callback within a transaction (sync)
   */
  transaction<T>(callback: () => T): T;

  /**
   * Execute callback within a transaction (async)
   */
  transaction<T>(callback: () => Promise<T>): Promise<T>;

  /**
   * Execute callback within a transaction (implementation)
   */
  transaction<T>(callback: () => T | Promise<T>): T | Promise<T> {
    // Detect if callback is async by checking if it returns a Promise
    const result = callback();

    if (result instanceof Promise) {
      // For async, use manual transaction control
      return (async () => {
        this.db.exec('BEGIN TRANSACTION');
        try {
          const value = await result;
          this.db.exec('COMMIT');
          return value;
        } catch (error) {
          this.db.exec('ROLLBACK');
          throw error;
        }
      })();
    } else {
      // For sync, use better-sqlite3 transaction helper
      const txn = this.db.transaction(callback as () => T);
      return txn();
    }
  }

  /**
   * Begin a manual transaction (returns rollback/commit functions)
   */
  beginTransaction(): { rollback: () => void; commit: () => void } {
    this.db.exec('BEGIN TRANSACTION');
    return {
      rollback: () => this.db.exec('ROLLBACK'),
      commit: () => this.db.exec('COMMIT')
    };
  }

  /**
   * Check database connection health
   */
  healthCheck(): { healthy: boolean; error?: string } {
    try {
      this.db.prepare('SELECT 1').get();
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate content hash for deduplication (public for modification detection)
   */
  public hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Generate a unique ID for a context item
   */
  private generateId(type: ContextType, name: string): string {
    return `${type}:${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  // ==================== Context Items ====================

  /**
   * Insert or update a context item
   */
  upsertItem(item: Omit<ContextItem, 'id' | 'contentHash' | 'createdAt' | 'updatedAt'>): ContextItem {
    const id = this.generateId(item.type, item.name);
    const contentHash = this.hashContent(item.content);
    
    const stmt = this.db.prepare(`
      INSERT INTO context_items (id, type, name, content, metadata, file_path, content_hash, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        metadata = excluded.metadata,
        file_path = excluded.file_path,
        content_hash = excluded.content_hash,
        updated_at = datetime('now')
      RETURNING *
    `);
    
    const row = stmt.get(
      id,
      item.type,
      item.name,
      item.content,
      item.metadata ? JSON.stringify(item.metadata) : null,
      item.filePath || null,
      contentHash
    ) as Record<string, unknown>;
    
    return this.rowToItem(row);
  }

  /**
   * Get a context item by ID
   */
  getItem(id: string): ContextItem | null {
    const stmt = this.db.prepare('SELECT * FROM context_items WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToItem(row) : null;
  }

  /**
   * Get items by type
   */
  getItemsByType(type: ContextType): ContextItem[] {
    const stmt = this.db.prepare('SELECT * FROM context_items WHERE type = ? ORDER BY name');
    const rows = stmt.all(type) as Record<string, unknown>[];
    return rows.map(row => this.rowToItem(row));
  }

  /**
   * Get all items
   */
  getAllItems(): ContextItem[] {
    const stmt = this.db.prepare('SELECT * FROM context_items ORDER BY type, name');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(row => this.rowToItem(row));
  }

  /**
   * Delete a context item
   */
  deleteItem(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM context_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete items older than specified days
   */
  deleteStaleItems(daysOld: number, type?: ContextType): number {
    const stmt = this.db.prepare(`
      DELETE FROM context_items
      WHERE datetime(updated_at) < datetime('now', '-' || ? || ' days')
      ${type ? 'AND type = ?' : ''}
    `);
    const result = stmt.run(...(type ? [daysOld, type] : [daysOld]));
    return result.changes;
  }

  /**
   * Search items by text (full-text grep-style)
   */
  searchText(query: string, type?: ContextType): ContextItem[] {
    const pattern = `%${query}%`;
    let sql = 'SELECT * FROM context_items WHERE (content LIKE ? OR name LIKE ?)';
    const params: unknown[] = [pattern, pattern];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY name LIMIT 50';
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToItem(row));
  }

  /**
   * Convert database row to ContextItem
   */
  private rowToItem(row: Record<string, unknown>): ContextItem {
    return {
      id: row.id as string,
      type: row.type as ContextType,
      name: row.name as string,
      content: row.content as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      filePath: row.file_path as string | undefined,
      contentHash: row.content_hash as string | undefined,
      createdAt: row.created_at as string | undefined,
      updatedAt: row.updated_at as string | undefined
    };
  }

  /**
   * Calculate relevance score for a search result
   */
  private calculateRelevance(
    item: ContextItem,
    query: string,
    baseScore: number
  ): number {
    let score = baseScore;

    // Boost score for exact name matches
    if (item.name.toLowerCase().includes(query.toLowerCase())) {
      score *= 1.5;
    }

    // Boost score for recently updated items
    if (item.updatedAt) {
      const daysSinceUpdate = (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        score *= 1.2; // 20% boost for items updated within a week
      }
    }

    // Boost score for certain types
    if (item.type === 'workflow' || item.type === 'agent') {
      score *= 1.1;
    }

    return score;
  }

  // ==================== AI Tool Configs ====================

  /**
   * Upsert an AI tool configuration
   */
  upsertToolConfig(config: Omit<AIToolConfig, 'contentHash' | 'lastSync'>): AIToolConfig {
    const contentHash = this.hashContent(config.content);
    
    const stmt = this.db.prepare(`
      INSERT INTO ai_tool_configs (id, tool_name, config_path, content, content_hash, last_sync, status, metadata)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        content_hash = excluded.content_hash,
        last_sync = datetime('now'),
        status = excluded.status,
        metadata = excluded.metadata
      RETURNING *
    `);
    
    const row = stmt.get(
      config.id,
      config.toolName,
      config.configPath,
      config.content,
      contentHash,
      config.status,
      config.metadata ? JSON.stringify(config.metadata) : null
    ) as Record<string, unknown>;
    
    return {
      id: row.id as string,
      toolName: row.tool_name as AITool,
      configPath: row.config_path as string,
      content: row.content as string,
      contentHash: row.content_hash as string,
      lastSync: row.last_sync as string,
      status: row.status as SyncStatus,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    };
  }

  /**
   * Get tool configs by tool name
   */
  getToolConfigs(toolName: AITool): AIToolConfig[] {
    const stmt = this.db.prepare('SELECT * FROM ai_tool_configs WHERE tool_name = ?');
    const rows = stmt.all(toolName) as Record<string, unknown>[];
    
    return rows.map(row => ({
      id: row.id as string,
      toolName: row.tool_name as AITool,
      configPath: row.config_path as string,
      content: row.content as string,
      contentHash: row.content_hash as string,
      lastSync: row.last_sync as string,
      status: row.status as SyncStatus,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    }));
  }

  /**
   * Get all tool configs
   */
  getAllToolConfigs(): AIToolConfig[] {
    const stmt = this.db.prepare('SELECT * FROM ai_tool_configs ORDER BY tool_name');
    const rows = stmt.all() as Record<string, unknown>[];
    
    return rows.map(row => ({
      id: row.id as string,
      toolName: row.tool_name as AITool,
      configPath: row.config_path as string,
      content: row.content as string,
      contentHash: row.content_hash as string,
      lastSync: row.last_sync as string,
      status: row.status as SyncStatus,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    }));
  }

  // ==================== Knowledge Graph ====================

  /**
   * Add a relationship to the knowledge graph
   */
  addRelation(edge: Omit<GraphEdge, 'id'>): GraphEdge {
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_graph (source_id, target_id, relation_type, weight, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_id, target_id, relation_type) DO UPDATE SET
        weight = excluded.weight,
        metadata = excluded.metadata
      RETURNING *
    `);
    
    const row = stmt.get(
      edge.sourceId,
      edge.targetId,
      edge.relationType,
      edge.weight ?? 1.0,
      edge.metadata ? JSON.stringify(edge.metadata) : null
    ) as Record<string, unknown>;
    
    return {
      id: row.id as number,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      relationType: row.relation_type as RelationType,
      weight: row.weight as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    };
  }

  /**
   * Get relations from a source item
   */
  getRelationsFrom(sourceId: string, relationType?: RelationType): GraphEdge[] {
    let sql = `
      SELECT kg.*, ci.name as target_name
      FROM knowledge_graph kg
      JOIN context_items ci ON kg.target_id = ci.id
      WHERE kg.source_id = ?
    `;
    const params: unknown[] = [sourceId];
    
    if (relationType) {
      sql += ' AND kg.relation_type = ?';
      params.push(relationType);
    }
    
    sql += ' ORDER BY kg.weight DESC';
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    
    return rows.map(row => ({
      id: row.id as number,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      relationType: row.relation_type as RelationType,
      weight: row.weight as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    }));
  }

  /**
   * Get relations to a target item
   */
  getRelationsTo(targetId: string, relationType?: RelationType): GraphEdge[] {
    let sql = `
      SELECT kg.*, ci.name as source_name
      FROM knowledge_graph kg
      JOIN context_items ci ON kg.source_id = ci.id
      WHERE kg.target_id = ?
    `;
    const params: unknown[] = [targetId];
    
    if (relationType) {
      sql += ' AND kg.relation_type = ?';
      params.push(relationType);
    }
    
    sql += ' ORDER BY kg.weight DESC';
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    
    return rows.map(row => ({
      id: row.id as number,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      relationType: row.relation_type as RelationType,
      weight: row.weight as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    }));
  }

  /**
   * Traverse the graph from a starting point
   */
  traverseGraph(startId: string, maxDepth = 3): Map<string, { item: ContextItem; depth: number }> {
    const visited = new Map<string, { item: ContextItem; depth: number }>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (visited.has(id) || depth > maxDepth) continue;
      
      const item = this.getItem(id);
      if (!item) continue;
      
      visited.set(id, { item, depth });
      
      // Get all outgoing relations
      const relations = this.getRelationsFrom(id);
      for (const rel of relations) {
        if (!visited.has(rel.targetId)) {
          queue.push({ id: rel.targetId, depth: depth + 1 });
        }
      }
    }
    
    return visited;
  }

  // ==================== Git Commits ====================

  /**
   * Insert or update a git commit
   */
  upsertCommit(commit: GitCommit): void {
    const stmt = this.db.prepare(`
      INSERT INTO git_commits (sha, message, author_name, author_email, timestamp, files_changed, stats)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sha) DO UPDATE SET
        message = excluded.message,
        files_changed = excluded.files_changed,
        stats = excluded.stats
    `);
    
    stmt.run(
      commit.sha,
      commit.message,
      commit.authorName || null,
      commit.authorEmail || null,
      commit.timestamp,
      commit.filesChanged ? JSON.stringify(commit.filesChanged) : null,
      commit.stats ? JSON.stringify(commit.stats) : null
    );
  }

  /**
   * Get recent commits
   */
  getRecentCommits(limit = 50): GitCommit[] {
    const stmt = this.db.prepare(`
      SELECT * FROM git_commits
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as Record<string, unknown>[];
    
    return rows.map(row => ({
      sha: row.sha as string,
      message: row.message as string,
      authorName: row.author_name as string | undefined,
      authorEmail: row.author_email as string | undefined,
      timestamp: row.timestamp as string,
      filesChanged: row.files_changed ? JSON.parse(row.files_changed as string) : undefined,
      stats: row.stats ? JSON.parse(row.stats as string) : undefined
    }));
  }

  // ==================== Sync State ====================

  /**
   * Update sync state for a tool
   */
  updateSyncState(state: SyncState): void {
    const stmt = this.db.prepare(`
      INSERT INTO sync_state (id, tool, content_hash, last_sync, file_path, status, metadata)
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content_hash = excluded.content_hash,
        last_sync = datetime('now'),
        status = excluded.status,
        metadata = excluded.metadata
    `);
    
    stmt.run(
      state.id,
      state.tool,
      state.contentHash || null,
      state.filePath || null,
      state.status,
      state.metadata ? JSON.stringify(state.metadata) : null
    );
  }

  /**
   * Get sync state for a tool
   */
  getSyncState(tool: string): SyncState[] {
    const stmt = this.db.prepare('SELECT * FROM sync_state WHERE tool = ?');
    const rows = stmt.all(tool) as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as string,
      tool: row.tool as string,
      contentHash: row.content_hash as string | undefined,
      lastSync: row.last_sync as string,
      filePath: row.file_path as string | undefined,
      status: row.status as SyncStatus,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      k0ntextVersion: row.k0ntext_version as string | undefined,
      userModified: row.user_modified as number | undefined,
      lastChecked: row.last_checked as string | undefined
    }));
  }

  // ==================== Version Tracking ====================

  /**
   * Get all version tracking records
   */
  getAllVersionTracking(): VersionTracking[] {
    const stmt = this.db.prepare(`
      SELECT tool, k0ntext_version, user_modified, last_checked, file_path, content_hash
      FROM sync_state
      WHERE k0ntext_version IS NOT NULL
    `);
    const rows = stmt.all() as Record<string, unknown>[];

    return rows.map(row => ({
      tool: row.tool as string,
      k0ntextVersion: row.k0ntext_version as string,
      userModified: Boolean(row.user_modified as number),
      lastChecked: row.last_checked as string | undefined,
      filePath: row.file_path as string | undefined,
      contentHash: row.content_hash as string | undefined
    }));
  }

  /**
   * Update version tracking for a tool
   */
  updateVersionTracking(tracking: VersionTracking): void {
    // Find the sync state record for this tool (or create a new one)
    const id = `${tracking.tool}:version-tracking`;

    const stmt = this.db.prepare(`
      INSERT INTO sync_state (id, tool, k0ntext_version, user_modified, last_checked, file_path, content_hash, last_sync, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'synced')
      ON CONFLICT(id) DO UPDATE SET
        k0ntext_version = excluded.k0ntext_version,
        user_modified = excluded.user_modified,
        last_checked = excluded.last_checked,
        file_path = excluded.file_path,
        content_hash = excluded.content_hash,
        last_sync = datetime('now')
    `);

    stmt.run(
      id,
      tracking.tool,
      tracking.k0ntextVersion,
      tracking.userModified ? 1 : 0,
      tracking.lastChecked || new Date().toISOString(),
      tracking.filePath || null,
      tracking.contentHash || null
    );
  }

  /**
   * Get version tracking for a specific tool
   */
  getVersionTracking(tool: string): VersionTracking | null {
    const stmt = this.db.prepare(`
      SELECT tool, k0ntext_version, user_modified, last_checked, file_path, content_hash
      FROM sync_state
      WHERE tool = ? AND k0ntext_version IS NOT NULL
      LIMIT 1
    `);
    const row = stmt.get(tool) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      tool: row.tool as string,
      k0ntextVersion: row.k0ntext_version as string,
      userModified: Boolean(row.user_modified as number),
      lastChecked: row.last_checked as string | undefined,
      filePath: row.file_path as string | undefined,
      contentHash: row.content_hash as string | undefined
    };
  }

  // ==================== Generated Files Tracking ====================

  /**
   * Upsert a generated file record
   */
  upsertGeneratedFile(record: {
    tool: string;
    filePath: string;
    contentHash: string;
    backupPath?: string;
    metadata?: Record<string, unknown>;
  }): GeneratedFile {
    const id = `${record.tool}:${record.filePath}`;

    const stmt = this.db.prepare(`
      INSERT INTO generated_files (id, tool, file_path, content_hash, backup_path, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content_hash = excluded.content_hash,
        backup_path = excluded.backup_path,
        metadata = excluded.metadata,
        last_verified_at = datetime('now')
      RETURNING *
    `);

    const row = stmt.get(
      id,
      record.tool,
      record.filePath,
      record.contentHash,
      record.backupPath || null,
      record.metadata ? JSON.stringify(record.metadata) : null
    ) as Record<string, unknown>;

    return {
      id: row.id as string,
      tool: row.tool as string,
      filePath: row.file_path as string,
      contentHash: row.content_hash as string,
      backupPath: row.backup_path as string | undefined,
      generatedAt: row.generated_at as string,
      lastVerifiedAt: row.last_verified_at as string | undefined,
      userModified: Boolean(row.user_modified as number),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    };
  }

  /**
   * Get generated file info by tool and path
   */
  getGeneratedFileInfo(tool: string, filePath: string): GeneratedFile | null {
    const id = `${tool}:${filePath}`;
    const stmt = this.db.prepare('SELECT * FROM generated_files WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: row.id as string,
      tool: row.tool as string,
      filePath: row.file_path as string,
      contentHash: row.content_hash as string,
      backupPath: row.backup_path as string | undefined,
      generatedAt: row.generated_at as string,
      lastVerifiedAt: row.last_verified_at as string | undefined,
      userModified: Boolean(row.user_modified as number),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    };
  }

  /**
   * Mark a generated file as user modified
   */
  markUserModified(tool: string, filePath: string): void {
    const id = `${tool}:${filePath}`;
    const stmt = this.db.prepare(`
      UPDATE generated_files
      SET user_modified = 1, last_verified_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  /**
   * Get all generated files for a tool
   */
  getGeneratedFiles(tool: string): GeneratedFile[] {
    const stmt = this.db.prepare('SELECT * FROM generated_files WHERE tool = ?');
    const rows = stmt.all(tool) as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as string,
      tool: row.tool as string,
      filePath: row.file_path as string,
      contentHash: row.content_hash as string,
      backupPath: row.backup_path as string | undefined,
      generatedAt: row.generated_at as string,
      lastVerifiedAt: row.last_verified_at as string | undefined,
      userModified: Boolean(row.user_modified as number),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    }));
  }

  // ==================== Embeddings ====================

  /**
   * Store an embedding
   */
  storeEmbedding(contextId: string, embedding: number[]): void {
    // Delete existing embedding first (virtual tables don't support UPSERT)
    this.deleteEmbedding(contextId);

    const stmt = this.db.prepare(`
      INSERT INTO embeddings (context_id, embedding)
      VALUES (?, ?)
    `);

    // Convert to blob for sqlite-vec
    const buffer = new Float32Array(embedding);
    stmt.run(contextId, Buffer.from(buffer.buffer));
  }

  /**
   * Search by embedding similarity
   */
  searchByEmbedding(queryEmbedding: number[], limit = 10): SearchResult[] {
    const buffer = new Float32Array(queryEmbedding);

    const stmt = this.db.prepare(`
      SELECT
        e.context_id,
        e.embedding,
        ci.*,
        vec_distance_cosine(e.embedding, ?) as distance
      FROM embeddings e
      JOIN context_items ci ON e.context_id = ci.id
      ORDER BY distance
      LIMIT ?
    `);

    const rows = stmt.all(Buffer.from(buffer.buffer), limit) as Record<string, unknown>[];

    return rows.map(row => ({
      item: this.rowToItem(row),
      similarity: 1 - (row.distance as number || 0) // Convert distance to similarity
    }));
  }

  /**
   * Hybrid search combining vector and text search
   */
  hybridSearch(
    query: string,
    queryEmbedding: number[] | null,
    options: {
      limit?: number;
      type?: ContextType;
      vectorWeight?: number; // 0-1, higher = more weight on semantic
    } = {}
  ): SearchResult[] {
    const {
      limit = 10,
      type,
      vectorWeight = 0.7
    } = options;

    const textResults = this.searchText(query, type);
    const semanticResults = queryEmbedding ? this.searchByEmbedding(queryEmbedding, limit * 2) : [];

    // Combine and score
    const combinedScores = new Map<string, number>();

    // Score text results (inverse of position)
    for (let i = 0; i < textResults.length; i++) {
      const score = (1 - i / textResults.length) * (1 - vectorWeight);
      combinedScores.set(textResults[i].id, (combinedScores.get(textResults[i].id) || 0) + score);
    }

    // Score semantic results
    for (const result of semanticResults) {
      const score = result.similarity * vectorWeight;
      combinedScores.set(result.item.id, (combinedScores.get(result.item.id) || 0) + score);
    }

    // Sort by combined score
    const results = Array.from(combinedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.getItem(id)!)
      .filter(item => item !== null);

    return results.map(item => ({
      item,
      similarity: combinedScores.get(item.id) || 0
    }));
  }

  /**
   * Delete an embedding
   */
  deleteEmbedding(contextId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM embeddings WHERE context_id = ?');
    const result = stmt.run(contextId);
    return result.changes > 0;
  }

  /**
   * Insert or update an embedding for a file by path
   */
  insertEmbedding(filePath: string, embedding: number[]): void {
    const itemId = this.getItemIdByPath(filePath);

    if (!itemId) {
      throw new Error(`Cannot insert embedding: no item found for path ${filePath}`);
    }

    this.storeEmbedding(itemId, embedding);
  }

  /**
   * Get item ID by file path
   */
  private getItemIdByPath(filePath: string): string | null {
    const stmt = this.db.prepare('SELECT id FROM context_items WHERE file_path = ? LIMIT 1');
    const row = stmt.get(filePath) as { id: string } | undefined;
    return row?.id || null;
  }

  // ==================== Analytics ====================

  /**
   * Log a usage event
   */
  logUsage(toolName: string, query?: string, resultCount?: number, latencyMs?: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO usage_analytics (tool_name, query, result_count, latency_ms)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(toolName, query || null, resultCount ?? null, latencyMs ?? null);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(days = 30): { toolName: string; count: number; avgLatency: number }[] {
    const stmt = this.db.prepare(`
      SELECT 
        tool_name,
        COUNT(*) as count,
        AVG(latency_ms) as avg_latency
      FROM usage_analytics
      WHERE timestamp > datetime('now', '-' || ? || ' days')
      GROUP BY tool_name
      ORDER BY count DESC
    `);
    
    const rows = stmt.all(days) as Record<string, unknown>[];
    
    return rows.map(row => ({
      toolName: row.tool_name as string,
      count: row.count as number,
      avgLatency: row.avg_latency as number
    }));
  }

  // ==================== Utility ====================

  /**
   * Get database path
   */
  getPath(): string {
    return this.dbPath;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    items: number;
    relations: number;
    commits: number;
    embeddings: number;
    toolConfigs: number;
    path: string;
  } {
    const itemCount = (this.db.prepare('SELECT COUNT(*) as count FROM context_items').get() as { count: number }).count;
    const relationCount = (this.db.prepare('SELECT COUNT(*) as count FROM knowledge_graph').get() as { count: number }).count;
    const commitCount = (this.db.prepare('SELECT COUNT(*) as count FROM git_commits').get() as { count: number }).count;
    const toolConfigCount = (this.db.prepare('SELECT COUNT(*) as count FROM ai_tool_configs').get() as { count: number }).count;

    let embeddingCount = 0;
    try {
      embeddingCount = (this.db.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number }).count;
    } catch {
      // Vector table might not exist yet
    }

    return {
      items: itemCount,
      relations: relationCount,
      commits: commitCount,
      embeddings: embeddingCount,
      toolConfigs: toolConfigCount,
      path: this.dbPath
    };
  }

  /**
   * Get raw database instance (for advanced operations)
   */
  getRawDb(): Database.Database {
    return this.db;
  }

  /**
   * Vacuum database to reclaim space
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * Reindex database for optimization
   */
  reindex(): void {
    this.db.exec('REINDEX');
  }

  /**
   * Backup database to specified path
   */
  backup(backupPath: string): void {
    try {
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Close the database before copying to ensure consistency
      this.db.close();
      fs.copyFileSync(this.dbPath, backupPath);
      // Reopen the database
      this.db = new Database(this.dbPath);
      this.db.pragma('foreign_keys = ON');
      sqliteVec.load(this.db);

      console.log(`Database backed up to: ${backupPath}`);
    } catch (error) {
      // Try to reopen database if copy failed
      try {
        this.db = new Database(this.dbPath);
        this.db.pragma('foreign_keys = ON');
        sqliteVec.load(this.db);
      } catch {
        // Ignore reopen errors
      }
      throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
