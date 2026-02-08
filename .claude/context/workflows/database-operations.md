# Database Operations Workflow

**Last Updated:** 2026-02-07
**Last Verified Against Code:** 2026-02-07 (commit: 09ca443)
**Complexity:** MEDIUM
**Token Estimate:** ~8,000 tokens (4% of 200k context)

---

## Quick Navigation

- [Overview](#overview)
- [Entry Points](#entry-points)
- [Sub-Workflow 1: Database Indexing](#sub-workflow-1-database-indexing)
- [Sub-Workflow 2: Data Management](#sub-workflow-2-data-management)
- [Database Schema](#database-schema)
- [External APIs](#external-apis)
- [Test Coverage](#test-coverage)
- [Known Gotchas](#known-gotchas)
- [Complete Call Chain](#complete-call-chain)
- [File Reference Table](#file-reference-table)

---

## Overview

**User Journey:**
A developer uses k0ntext commands to index their codebase, manage context data, and perform searches across the entire project. The system automatically handles SQLite database operations including storage, retrieval, vector embeddings, and cross-tool sync state tracking.

**Key Features:**
- Codebase indexing with intelligent analysis
- Vector embeddings for semantic search
- Cross-tool configuration synchronization
- Performance analytics tracking
- Automatic schema migration

**Business Logic Summary:**
The database operations workflow handles all persistent data storage for k0ntext, including context items, knowledge graph relationships, AI tool configurations, and performance metrics. It uses SQLite with sqlite-vec for vector search capabilities.

---

## Entry Points

### Entry Point 1: CLI Database Commands

**File:** `src/cli/index.ts` [Line 138]
**Function:** `program.command()` [Lines 200-395]
**Trigger:** `k0ntext index` command execution

```bash
# Index codebase content into database
k0ntext index
k0ntext index --docs        # Documentation only
k0ntext index --code        # Source code only
k0ntext index --tools       # Tool configs only
```

---

### Entry Point 2: Database Statistics

**File:** `src/cli/index.ts` [Line 490]
**Function:** `program.command('stats')` [Lines 490-515]
**Trigger:** `k0ntext stats` command execution

```bash
# Show database statistics
k0ntext stats
```

---

### Entry Point 3: Context Validation

**File:** `src/cli/commands/validate.ts` [Line 29]
**Function:** `healthCheck()` and `validateContext()` [Lines 29-63]
**Trigger:** `k0ntext validate` command execution

```bash
# Validate database integrity
k0ntext validate
```

---

## Sub-Workflow 1: Database Indexing

**Purpose:** Parse and store codebase content in the database
**Entry Point:** `src/cli/index.ts:index()` [Line 200]

### Call Chain

```
index() [src/cli/index.ts:200]
├─ createIntelligentAnalyzer() [src/cli/index.ts:216]
├─ DatabaseClient() [src/cli/index.ts:217]
├─ analyzer.discoverDocs() [src/cli/index.ts:228]
├─ analyzer.discoverCode() [src/cli/index.ts:229]
├─ analyzer.discoverToolConfigs() [src/cli/index.ts:230]
├─ db.upsertItem() [src/cli/index.ts:239, 254, 270, 291, 310, 331]
├─ analyzer.generateEmbeddings() [src/cli/index.ts:351]
└─ db.storeEmbedding() [src/cli/index.ts:364]
```

### Database Operations

| Operation | Table | Purpose |
|-----------|-------|---------|
| READ | `context_items` | Check existing content hashes |
| WRITE | `context_items` | Store indexed files and docs |
| WRITE | `embeddings` | Store vector embeddings |
| UPDATE | `schema_version` | Track database schema version |

### External APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| OpenRouter | `POST /embeddings` | Generate embeddings for semantic search |

### Error Handling

| Error | Handling | Recovery |
|-------|----------|----------|
| File not found | Skip file with warning | Continue with next file |
| Database locked | Retry with exponential backoff | Auto-retry up to 3 times |
| Embedding generation fail | Log error, skip embedding | Continue with other files |

---

## Sub-Workflow 2: Data Management

**Purpose:** Handle database operations for sync, export, and validation
**Entry Point:** `src/cli/sync.ts:SyncManager()` [Line 75]

### Call Chain

```
SyncManager() [src/cli/sync.ts:45]
├─ getSyncState() [src/cli/sync.ts:75]
├─ getToolConfigs() [src/cli/sync.ts:89]
├─ updateSyncState() [src/cli/sync.ts:186]
├─ generateShadowFiles() [src/cli/sync.ts:88]
└─ backupState() [src/cli/sync.ts:134]
```

### Database Operations

| Operation | Table | Purpose |
|-----------|-------|---------|
| READ | `sync_state` | Check last sync status |
| READ | `ai_tool_configs` | Get tool configurations |
| WRITE | `sync_state` | Update sync timestamps |
| WRITE | `ai_tool_configs` | Store updated configurations |

### External APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| Git | `git log` | Track commit history for sync |
| GitHub | `GET /repos/:owner/:repo` | Fetch release information |

### Error Handling

| Error | Handling | Recovery |
|-------|----------|----------|
| Sync conflict | Mark as conflict in database | Manual intervention required |
| Config mismatch | Generate conflict markers | Use latest version, notify user |
| Network error | Retry with backoff | Continue with other tools |

---

## Database Schema

### Tables Involved

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `context_items` | Core context storage | `id`, `type`, `name`, `content`, `file_path` |
| `knowledge_graph` | Relationships between items | `source_id`, `target_id`, `relation_type` |
| `git_commits` | Git commit tracking | `sha`, `message`, `timestamp` |
| `ai_tool_configs` | AI tool configurations | `tool_name`, `config_path`, `content` |
| `sync_state` | Cross-tool sync state | `tool`, `content_hash`, `status` |
| `embeddings` | Vector embeddings | `context_id`, `embedding` |
| `usage_analytics` | Usage tracking | `query`, `tool_name`, `latency_ms` |
| `performance_metrics` | Performance tracking | `metric_name`, `metric_value`, `recorded_at` |

### Relationships

```
context_items ─┬─> knowledge_graph (one-to-many via source_id)
              ├─> knowledge_graph (one-to-many via target_id)
              ├─> embeddings (one-to-one)
              └─> git_commits (one-to-many via file_path)
```

### Schema Notes

- Uses SQLite with foreign key constraints enabled
- Supports 1536-dimensional embeddings for OpenRouter compatibility
- Automatic schema migration from legacy `.ai-context.db` to `.k0ntext.db`
- Indexes optimized for common query patterns

---

## External APIs

### OpenRouter (Embeddings)

**Base URL:** `https://openrouter.ai/api`
**Authentication:** API Key (`OPENROUTER_API_KEY`)
**Rate Limits:** 15 RPM for free tier

**Endpoints Used:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/embeddings` | POST | Generate text embeddings |

**Error Codes:**
| Code | Meaning | Handling |
|------|---------|----------|
| 400 | Invalid request | Skip embedding, log error |
| 429 | Rate limit | Retry with exponential backoff |
| 500 | Server error | Skip with warning |

---

## Test Coverage

### E2E Tests

| Test File | Test Name | Coverage |
|-----------|-----------|----------|
| `tests/cli/index.test.ts` | `index_command` | Database indexing workflow |
| `tests/cli/sync.test.ts` | `sync_command` | Cross-tool sync operations |

### Unit Tests

| Test File | Coverage Area |
|-----------|---------------|
| `tests/db/client.test.ts` | Database client operations |
| `tests/db/schema.test.ts` | Schema validation |

### Coverage Gaps

- ❌ Integration tests with OpenRouter API
- ⚠️ Large dataset performance testing
- ⚠️ Concurrent access scenarios

### Running Tests

```bash
# Run all tests
npm test

# Run database-specific tests
npm test -- grep "db"
```

---

## Known Gotchas

### Gotcha 1: Database Migration Issues

**Severity:** HIGH
**Symptom:** Error when first running k0ntext after upgrade
**Root Cause:** Schema changes between versions

**Fix:**
```typescript
// Check if database needs migration
const legacyPath = path.join(process.cwd(), '.ai-context.db');
if (fs.existsSync(legacyPath) && !fs.existsSync(newPath)) {
  fs.copyFileSync(legacyPath, newPath);
}
```

**Prevention:** Always run `k0ntext validate` after upgrades
**Workflow Impact:** Sub-Workflow 2 is affected

---

### Gotcha 2: Large File Content Truncation

**Severity:** MEDIUM
**Symptom:** Large files not fully indexed
**Root Cause:** Content limits prevent memory issues

**Fix:**
```typescript
// Content size limits by type
const contentLimits = {
  doc: 50000,      // 50KB for docs
  code: 20000,     // 20KB for code
  tool_config: 50000  // 50KB for configs
};
```

**Prevention:** Consider indexing large files selectively
**Workflow Impact:** Sub-Workflow 1 is affected

---

### Gotcha 3: Concurrent Database Access

**Severity:** MEDIUM
**Symptom:** "Database locked" errors during high usage
**Root Cause:** SQLite file locks in concurrent operations

**Fix:**
```typescript
// Use transaction helper for async operations
this.transaction(async () => {
  // Multiple database operations
});
```

**Prevention:** Avoid running multiple k0ntext commands simultaneously
**Workflow Impact:** All sub-workflows affected

---

## Complete Call Chain

### End-to-End Flow Diagram

```
[Developer Command]
         │
         ▼
┌─────────────────────┐
│   CLI Entry Point   │ src/cli/index.ts:138
│   program.command() │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Command Routing   │
│   (index/stats/validate) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Database Client   │ src/db/client.ts:101
│   DatabaseClient()   │
└─────────┬───────────┘
          │
          ▼
├─────────────────────────────────────────────────────┐
│                      Fork Point                     │
├─────────────────────────────────────────────────────┤
│                                                 │
│  Sub-Workflow 1 (Indexing)                      │
│                                                 │
│  └─> Content Analysis                          │
│      ├─> Discover Files                          │
│      ├─> Store in Context Items                 │
│      └─> Generate & Store Embeddings             │
│                                                 │
│                                                 │
│  Sub-Workflow 2 (Data Management)               │
│                                                 │
│  └─> Sync Operations                            │
│      ├─> Check Sync State                        │
│      ├─> Compare with Codebase                 │
│      └─> Update Sync State                      │
│                                                 │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Response/         │
│   Completion        │
└─────────────────────┘
```

### State Transitions

```
[EMPTY] ──index──► [INDEXED] ──search──► [SEARCH_READY]
   │                      │                  │
   └─── validate ──► [VALID] ─── sync ──► [SYNCED]
                           │
                           └─── update ──► [STALE]
```

---

## File Reference Table

| File | Size | Purpose | Key Functions |
|------|------|---------|---------------|
| `src/db/client.ts` | 18 KB | Database operations | `upsertItem`, `storeEmbedding`, `getStats` |
| `src/db/schema.ts` | 14 KB | Database schema definitions | `SCHEMA_SQL`, `VECTOR_SCHEMA_SQL` |
| `src/cli/index.ts` | 22 KB | CLI command routing | `index`, `stats`, `search` |
| `src/cli/sync.ts` | 9 KB | Cross-tool sync logic | `SyncManager`, `generateShadowFiles` |
| `src/cli/commands/validate.ts` | 3 KB | Database validation | `healthCheck`, `validateContext` |

---

## Maintenance Schedule

| Task | Frequency | Last Done | Next Due |
|------|-----------|-----------|----------|
| Verify line numbers | Monthly | 2026-02-07 | 2026-03-07 |
| Full audit | Quarterly | 2026-02-07 | 2026-05-07 |

---

## Related Documentation

- **Parent Index:** [.claude/indexes/workflows/CATEGORY_INDEX.md](../../indexes/workflows/CATEGORY_INDEX.md)
- **Related Workflows:**
  - [context-generation.md](./context-generation.md) (to be created)
  - [cross-tool-sync.md](./cross-tool-sync.md) (to be created)
- **Responsible Agent:** [database-ops.md](../../agents/database-ops.md)
- **Testing Specialist:** [@testing-specialist](../../agents/testing-specialist.md) - Ensures test coverage and quality

## Cross-References

### Key Dependencies
- **@database-ops** - Database schema and operations management
- **@testing-specialist** - Test coverage and validation
- **@integration-hub** - External API integrations
- **@core-architect** - High-level architecture decisions

### Integration Points
- **Embedding Workflow:** Uses database for storing vector embeddings
- **Sync Workflow:** Relies on database for tracking sync state
- **CLI Commands:** Depend on database for context storage and retrieval

### Performance Metrics
- Database indexing time tracked in [performance metrics](../../context/workflows/performance-monitoring.md) (to be created)
- Search latency monitored in [usage analytics](../../context/workflows/analytics.md) (to be created)

---

## Change Log

| Date | Change | Commit |
|------|--------|--------|
| 2026-02-07 | Initial documentation | `09ca443` |

---

**Version:** 1.0
**Word Count:** ~1,200 words
**Token Estimate:** ~8,000 tokens