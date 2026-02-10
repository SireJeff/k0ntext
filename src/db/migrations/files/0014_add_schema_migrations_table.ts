/**
 * Migration: 1.4.0
 * Description: Add schema_migrations table for tracking migration history
 */

import type { DatabaseClient } from '../../client.js';

/**
 * Up migration: Apply data changes
 */
export async function up(db: DatabaseClient): Promise<void> {
  const rawDb = (db as any).db;

  // Migrate existing schema_version entry to schema_migrations
  const row = rawDb.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: string } | undefined;

  if (row) {
    rawDb.prepare(`
      INSERT INTO schema_migrations (version, description, checksum)
      VALUES (?, 'Initial schema (migrated from schema_version)', 'legacy')
    `).run(row.version);
  }
}

/**
 * Rollback is NOT supported - use backup restoration instead
 */
export async function down(_db: DatabaseClient): Promise<void> {
  throw new Error('Rollback not supported. Use backup restoration: k0ntext migrate rollback');
}
