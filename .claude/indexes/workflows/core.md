# Core Workflows Domain Index

**Category:** Core
**Context Size:** ~8,000 tokens (4% of 200k window)

---

## Domain Overview

Core workflows manage the fundamental infrastructure and operations of k0ntext, including database management, CLI command processing, and context generation.

---

## Available Workflows

### 1. Database Operations
**File:** [`../context/workflows/database-operations.md`](../context/workflows/database-operations.md)
**Status:** ✅ Complete
**Complexity:** Medium
**Priority:** High

**Description:** Manages SQLite database operations including indexing, storage, retrieval, and vector embeddings.

**Key Features:**
- Codebase indexing with intelligent analysis
- Vector embeddings for semantic search
- Cross-tool sync state tracking
- Performance analytics

**Entry Points:**
- `k0ntext index` - Index codebase content
- `k0ntext stats` - View database statistics
- `k0ntext validate` - Validate database integrity

---

### 2. Context Generation
**File:** [`../context/workflows/context-generation.md`](../context/workflows/context-generation.md) (to be created)
**Status:** 🔄 In Progress
**Complexity:** High
**Priority:** High

**Description:** Generates context files for all AI tools (Claude, Copilot, Cline, etc.)

**Key Features:**
- Multi-tool context generation
- Template population
- Configuration management
- Cross-tool synchronization

**Entry Points:**
- `k0ntext generate` - Generate all tool contexts
- `k0ntext generate --tool <name>` - Generate specific tool

---

### 3. CLI Commands
**File:** [`../context/workflows/cli-commands.md`](../context/workflows/cli-commands.md) (to be created)
**Status:** ⏳ Planned
**Complexity:** Medium
**Priority:** Medium

**Description:** Manages all CLI command implementations

**Key Features:**
- Command routing
- Option parsing
- Error handling
- Help system

**Entry Points:**
- All CLI commands (init, index, search, etc.)

---

### 4. Error Handling
**File:** [`../context/workflows/error-handling.md`](../context/workflows/error-handling.md) (to be created)
**Status:** ⏳ Planned
**Complexity:** Low
**Priority:** Medium

**Description:** Centralized error handling and recovery

**Key Features:**
- Error classification
- Recovery strategies
- User notifications
- Logging

**Entry Points:**
- Global error handlers

---

## Quick Navigation

For high-priority workflows, use these navigation paths:

### Database Operations
1. Start here (~8k tokens)
2. Load workflow detail (~40k tokens)
3. Implement database operations

### Context Generation
1. Start here (~8k tokens)
2. Wait for workflow completion
3. Load workflow detail (~40k tokens)
4. Implement context generation

---

## Agent Assignments

### @database-ops
- Database Operations ✅

### @context-engineer
- Context Generation 🔄
- CLI Commands ⏳

### @core-architect
- CLI Commands ⏳
- Error Handling ⏳

### @testing-specialist
- All workflows in this domain

---

## Testing Coverage

| Workflow | Status | Coverage % |
|----------|--------|------------|
| Database Operations | ✅ Complete | 85% |
| Context Generation | 🔄 In Progress | 0% |
| CLI Commands | ⏳ Planned | 0% |
| Error Handling | ⏳ Planned | 0% |

---

## Dependencies

### External Dependencies
- SQLite with sqlite-vec extension
- OpenRouter API (for embeddings)
- Git integration

### Internal Dependencies
- [Intelligent Analyzer](../../src/analyzer/intelligent-analyzer.ts)
- [Database Client](../../src/db/client.ts)
- [CLI Router](../../src/cli/index.ts)

---

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Database Index Time | <5s (1000 files) | <3s |
| Search Latency | <100ms | <50ms |
| Memory Usage | <512MB | <256MB |

---

## Next Steps

1. **Complete Context Generation workflow documentation**
   - Document all aspects of template generation
   - Add cross-tool sync details
   - Update test coverage

2. **Create CLI Commands workflow**
   - Document all command implementations
   - Add error handling scenarios
   - Include performance benchmarks

3. **Create Error Handling workflow**
   - Document error classification
   - Define recovery strategies
   - Add logging and monitoring

---

## Related Documentation

- **Parent Category Index:** [CATEGORY_INDEX.md](./CATEGORY_INDEX.md)
- **Workflow Detail Index:** [../context/workflows/WORKFLOW_INDEX.md](../context/workflows/WORKFLOW_INDEX.md)
- **Agent Definitions:** [../../agents/](../../agents/)

---

**Maintained by:** @testing-specialist
**Last Updated:** 2026-02-07
**Next Review:** 2026-03-07