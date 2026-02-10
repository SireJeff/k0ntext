/**
 * Migration Loader
 *
 * Discovers and loads migration files from src/db/migrations/files/
 */

import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import type { Migration } from './types.js';

const MIGRATIONS_DIR = path.join(
  path.dirname(import.meta.url.replace('file://', '')),
  'files'
);

/**
 * Convert schema version to filename slug
 * Examples: 1.4.0 -> 0014, 2.0.0 -> 0200
 */
export function schemaVersionToSlug(version: string): string {
  const parts = version.split('.');
  if (parts.length !== 3) throw new Error(`Invalid version: ${version}`);

  const major = parts[0].padStart(2, '0');
  const minor = parts[1].padStart(2, '0');
  return `${major}${minor}`;
}

/**
 * Convert filename slug to schema version
 */
export function schemaVersionFromSlug(slug: string): string {
  if (slug.length !== 4) throw new Error(`Invalid slug: ${slug}`);

  const major = parseInt(slug.slice(0, 2), 10);
  const minor = parseInt(slug.slice(2, 4), 10);
  return `${major}.${minor}.0`;
}

/**
 * Parse metadata from SQL file header comments
 */
async function parseSqlMetadata(sqlPath: string): Promise<{
  description: string;
  breaks: boolean;
  dependencies: string[];
}> {
  const content = await fs.readFile(sqlPath, 'utf-8');

  const descriptionMatch = content.match(/-- Description:\s*(.+)/);
  const breaksMatch = content.match(/-- Breaks:\s*(.+)/);
  const depsMatch = content.match(/-- Dependencies:\s*(.+)/);

  return {
    description: descriptionMatch ? descriptionMatch[1].trim() : 'No description',
    breaks: breaksMatch ? breaksMatch[1].trim() === 'true' : false,
    dependencies: depsMatch
      ? depsMatch[1].trim().split(',').map(d => d.trim()).filter(Boolean)
      : []
  };
}

/**
 * Discover all migration files
 */
export async function discoverMigrations(): Promise<Migration[]> {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    const migrations: Migration[] = [];

    for (const sqlFile of sqlFiles) {
      const match = sqlFile.match(/^(\d{4})_(.+)\.sql$/);
      if (!match) continue;

      const slug = match[1];
      const version = schemaVersionFromSlug(slug);
      const sqlPath = path.join(MIGRATIONS_DIR, sqlFile);
      const tsPath = path.join(MIGRATIONS_DIR, sqlFile.replace('.sql', '.ts'));

      const metadata = await parseSqlMetadata(sqlPath);
      const sqlContent = await fs.readFile(sqlPath, 'utf-8');
      const checksum = createHash('sha256').update(sqlContent).digest('hex').slice(0, 16);

      migrations.push({
        version,
        description: metadata.description,
        breaks: metadata.breaks,
        dependencies: metadata.dependencies,
        sqlPath,
        tsPath: await fileExists(tsPath) ? tsPath : undefined,
        checksum
      });
    }

    // Sort by version
    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  } catch {
    return [];
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a TypeScript migration module
 */
export async function loadMigration(tsPath: string): Promise<{
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}> {
  const module = await import(tsPath);
  return {
    up: module.up,
    down: module.down || (async () => { throw new Error('Rollback not supported'); })
  };
}
