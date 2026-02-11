# k0ntext v3.7.0 Release Plan

**Version:** 3.7.0 (Minor Release)
**Release Date:** TBD
**Base Version:** 3.6.0

---

## Overview

This release addresses critical bugs and improvements discovered during real-world testing across multiple projects (deadlinekiller-reorg, ssh_vpn_for_flux).

## Issues Discovered

### 1. Database Schema Migration Missing ✖
**Severity:** High
**Impact:** `k0ntext check --update` fails with "no such column: k0ntext_version"

**Root Cause:**
- The `sync_state` table schema changes planned for v3.6.0 were never added to the migration system
- Schema version was bumped to 1.4.0 but no corresponding migration SQL file existed

**Files Affected:**
- `src/db/migrations/files/0015_add_sync_state_version_tracking.sql` (needs to be created)
- `src/db/schema.ts` (SCHEMA_VERSION needs update to 1.5.0)

**Fix Required:**
```sql
-- Migration 0015: Add version tracking columns to sync_state
ALTER TABLE sync_state ADD COLUMN k0ntext_version TEXT;
ALTER TABLE sync_state ADD COLUMN user_modified INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN last_checked TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_state_version ON sync_state(k0ntext_version);
CREATE INDEX IF NOT EXISTS idx_sync_state_user_modified ON sync_state(user_modified);
```

### 2. UTF-8 BOM in .env Files ✖
**Severity:** Medium
**Impact:** OpenRouter API key not detected, intelligent analysis disabled

**Root Cause:**
- .env files with UTF-8 BOM (Byte Order Mark) cause `process.env.OPENROUTER_API_KEY` to fail
- Windows users often create .env files with BOM via certain editors

**Fix Required:**
- Strip BOM automatically when reading .env files
- Location: `src/embeddings/openrouter.ts` and `src/cli/index.ts`

### 3. Large Files Fail to Embed ✖
**Severity:** Medium
**Impact:** Files >8K tokens fail silently, reducing semantic search coverage

**Root Cause:**
- OpenRouter's text-embedding-3-small has 8191 token limit
- No automatic chunking for oversized files
- Warnings shown but no automatic recovery

**Fix Required:**
- Implement automatic chunking for large files in `embeddings:refresh`
- Target chunk size: ~3000 tokens (safety margin)
- Preserve context by chunking at paragraph boundaries

### 4. Migrate Command Not Visible ✖
**Severity:** Low
**Impact:** Users can't discover the migrate command via --help

**Root Cause:**
- Command registered but not appearing in help output
- May be commander.js configuration issue

**Fix Required:**
- Verify command registration in `src/cli/index.ts`
- Ensure `program.addCommand(migrateCommand)` is properly placed

---

## Implementation Plan

### Phase 1: Database Migration Fix
**Files to Create:**

1. `src/db/migrations/files/0015_add_sync_state_version_tracking.sql`
```sql
-- Description: Add version tracking columns to sync_state table
-- Breaks: false
-- Dependencies: 0014_add_schema_migrations_table

ALTER TABLE sync_state ADD COLUMN k0ntext_version TEXT;
ALTER TABLE sync_state ADD COLUMN user_modified INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN last_checked TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_state_version ON sync_state(k0ntext_version);
CREATE INDEX IF NOT EXISTS idx_sync_state_user_modified ON sync_state(user_modified);
```

**Files to Modify:**

2. `src/db/schema.ts`
```typescript
// Update SCHEMA_VERSION
export const SCHEMA_VERSION = '1.5.0';  // Changed from '1.4.0'
```

### Phase 2: BOM Stripping
**Files to Modify:**

1. `src/embeddings/openrouter.ts`
```typescript
// Add BOM stripping helper
function stripBOM(str: string): string {
  // UTF-8 BOM is EF BB BF (shown as \uFEFF)
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

// Apply when reading .env
export function getOpenRouterKey(): string | null {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf-8');
    content = stripBOM(content);
    // ... parse key from content
  }
}
```

2. `src/cli/index.ts` (init command)
```typescript
// Strip BOM when reading .env in init
const envContent = fs.readFileSync(envPath, 'utf-8');
const cleanEnv = envContent.replace(/^\uFEFF/, '');
```

### Phase 3: Auto-Chunking for Large Files
**Files to Create:**

1. `src/embeddings/chunker.ts`
```typescript
export interface ChunkOptions {
  maxTokens?: number;
  preserveParagraphs?: boolean;
  overlapTokens?: number;
}

export function chunkTextForEmbedding(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { maxTokens = 3000, preserveParagraphs = true } = options;

  // Estimate tokens (roughly 4 chars per token)
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];

  if (preserveParagraphs) {
    // Split by paragraphs and combine until limit
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  } else {
    // Simple character-based chunking
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars).trim());
    }
  }

  return chunks.filter(c => c.length > 100);
}
```

**Files to Modify:**

2. `src/cli/commands/embeddings-refresh.ts`
```typescript
import { chunkTextForEmbedding } from '../../embeddings/chunker.js';

// In the refresh logic:
async function generateEmbedding(item: ContextItem): Promise<void> {
  const content = item.content;

  // Check if content is too large
  const estimatedTokens = content.length / 4;

  if (estimatedTokens > 7000) {
    // Auto-chunk the content
    const chunks = chunkTextForEmbedding(content, {
      maxTokens: 3000,
      preserveParagraphs: true
    });

    console.log(`[INFO] Chunking large file (${chunks.length} chunks)`);

    for (let i = 0; i < chunks.length; i++) {
      await embedChunk(chunks[i], item, i + 1, chunks.length);
    }
  } else {
    // Normal embedding
    await embedSingle(content, item);
  }
}
```

### Phase 4: Migrate Command Fix
**Files to Verify:**

1. `src/cli/index.ts`
```typescript
// Ensure migrate command is registered AFTER all other commands
import { migrateCommand } from './commands/migrate.js';

// ... existing command registrations

// Add migrate command
program.addCommand(migrateCommand);
```

2. `src/cli/commands/migrate.ts`
```typescript
// Ensure command has proper description
export const migrateCommand = new Command('migrate')
  .description('Manage database migrations')
  // ... subcommands
```

---

## New Migration File

**File:** `src/db/migrations/files/0015_add_sync_state_version_tracking.sql`

```sql
-- Description: Add version tracking columns to sync_state table
-- Breaks: false
-- Dependencies: 0014_add_schema_migrations_table

-- Add k0ntext_version column to track package version when sync occurred
ALTER TABLE sync_state ADD COLUMN k0ntext_version TEXT;

-- Add user_modified flag to track if user manually edited the synced file
ALTER TABLE sync_state ADD COLUMN user_modified INTEGER DEFAULT 0;

-- Add last_checked timestamp for version checking
ALTER TABLE sync_state ADD COLUMN last_checked TEXT;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_state_version ON sync_state(k0ntext_version);
CREATE INDEX IF NOT EXISTS idx_sync_state_user_modified ON sync_state(user_modified);
```

---

## Testing Plan

### Manual Testing

1. **Migration Test:**
```bash
# Create fresh project with old k0ntext version
mkdir test-migration && cd test-migration
npx k0ntext@3.6.0 init

# Install new version
npm install k0ntext@3.7.0

# Verify migration runs automatically
npx k0ntext check --update
# Should NOT error about missing columns
```

2. **BOM Test:**
```bash
# Create .env with UTF-8 BOM
echo -ne '\xEF\xBB\xBFOPENROUTER_API_KEY=sk-test' > .env

# Run init
npx k0ntext init
# Should detect API key successfully
```

3. **Large File Test:**
```bash
# Create large file (>8K tokens)
python -c "print('# Test\\n' * 3000)" > LARGE_DOC.md

# Run embeddings refresh
npx k0ntext embeddings:refresh
# Should chunk automatically and embed all chunks
```

### Automated Tests

Add to `tests/`:
- `tests/migration-0015.test.ts` - Test schema migration
- `tests/bom-stripping.test.ts` - Test .env BOM handling
- `tests/chunking.test.ts` - Test text chunking logic

---

## Changelog Entry

```markdown
## [3.7.0] - 2026-02-XX

### Added
- Automatic file chunking for embeddings when content exceeds token limits
- UTF-8 BOM stripping from .env files for better Windows compatibility
- Migration 0015: Version tracking columns for sync_state table

### Fixed
- Database schema now properly migrates sync_state version tracking columns
- OpenRouter API key detection now works with UTF-8 BOM in .env files
- Large documentation files no longer fail to embed (auto-chunked)
- Migrate command now visible in CLI help output

### Improved
- Better error messages when embeddings fail due to file size
- Embeddings progress shows chunking information
- Version check database queries now use proper indexes
```

---

## Rollback Plan

If issues arise:
1. Users can run `k0ntext migrate rollback` to revert migration 0015
2. BOM stripping is non-destructive (only affects runtime reading)
3. Chunking can be disabled via environment variable: `K0NTEXT_NO_CHUNK=1`

---

## Release Checklist

- [ ] Create migration file 0015_add_sync_state_version_tracking.sql
- [ ] Update SCHEMA_VERSION to 1.5.0 in schema.ts
- [ ] Implement BOM stripping in embeddings/openrouter.ts
- [ ] Implement BOM stripping in cli/index.ts init command
- [ ] Create embeddings/chunker.ts module
- [ ] Update embeddings-refresh command to use chunking
- [ ] Verify migrate command registration
- [ ] Add tests for migration
- [ ] Add tests for BOM stripping
- [ ] Add tests for chunking
- [ ] Run full test suite: `npm test`
- [ ] Update CHANGELOG.md
- [ ] Update package.json version to 3.7.0
- [ ] Build: `npm run build`
- [ ] Commit changes
- [ ] Tag: `git tag v3.7.0`
- [ ] Push: `git push --tags`
- [ ] Publish: `npm publish --access public`

---

## Breaking Changes

None. This is a backward-compatible minor release.

---

## Deprecations

None.
