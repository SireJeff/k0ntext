# CLAUDE.md - K0ntext AI Context Engineering

This file provides guidance to Claude Code when working with code in this repository.

---

## Project Identity

**Platform:** Universal AI Context Engineering - CLI tools and templates for Claude Code, GitHub Copilot, Cline, Antigravity, Cursor, Windsurf, Aider, Continue, and Gemini
**Domain:** https://github.com/SireJeff/k0ntext
**Tech Stack:** Node.js, TypeScript, Vitest, npm, SQLite, OpenRouter
**Status:** Active (v3.8.0)

**Quick Reference:**
- **API:** MCP Server for AI tools
- **Repo:** https://github.com/SireJeff/k0ntext
- **Deploy:** npm registry
- **Package:** `k0ntext` on npm

---

## Essential Commands

### Development
```bash
npm install
npm run build
npm test
```

### Testing
```bash
npm test                           # All tests (watch mode)
npm run test:run                   # Run once (no watch)
```

### Database
```bash
# SQLite database at .k0ntext.db
k0ntext stats                     # View database stats
k0ntext index                     # Index codebase
k0ntext migrate up                # Run database migrations
```

### Deployment
```bash
npm publish --access public        # Publish to npm
```

### CLI Commands
```bash
k0ntext init                       # Initialize with intelligent analysis
k0ntext init --no-intelligent      # Skip OpenRouter analysis
k0ntext generate                   # Generate context for all AI tools
k0ntext mcp                        # Start MCP server
k0ntext sync                       # Sync across AI tools
k0ntext index                      # Index codebase into database
k0ntext search <query>             # Semantic search
k0ntext stats                      # Database statistics
k0ntext check                      # Check if context files are outdated
k0ntext restore                    # Restore AI tool configs from backups
k0ntext cleanup                    # Clean up other AI tool folders
k0ntext drift-detect               # AI-powered drift detection
k0ntext cross-sync                 # Sync across all AI tools
k0ntext hooks install              # Install git hooks
k0ntext fact-check                 # Validate documentation accuracy
k0ntext sync-templates             # Sync .claude/ templates from package
k0ntext template-status            # Show template sync status
k0ntext snapshot                   # Create database snapshots
k0ntext snapshot restore           # Restore from snapshot
```

---

## Navigation Rules

### High-Level Task (Refactoring a Flow)
**Example:** "Refactor the static analyzer to support a new framework"

**Chain:**
1. Start: Review `src/analyzer/` directory
2. Find: Relevant source modules
3. Check: Template files in `templates/base/` for context structure
4. Implement: Use appropriate specialized agent

**Context Budget:** ~40k tokens (20% of 200k window)

---

### Low-Level Task (Fix Hardcoded Value)
**Example:** "Fix a hardcoded path in the template populator"

**Chain:**
1. Start: Search Patterns section below
2. Pattern: Use grep/find
3. Fix: Direct file edits
4. Validate: Run tests

**Context Budget:** ~15k tokens (7.5% of 200k window)

---

### Feature Task (Add New Feature)
**Example:** "Add support for a new AI tool adapter"

**Chain:**
1. Start: Review `src/cli/` and `templates/` directories
2. Research: /rpi-research
3. Plan: /rpi-plan
4. Implement: /rpi-implement

**Context Budget:** ~50k tokens (25% of 200k window)

---

## Search Patterns

### Finding Configuration Values

**Environment variables:**
```bash
grep -r "process.env" src/
```

**Hardcoded URLs/domains:**
```bash
grep -r "https://" src/ --include="*.ts" --include="*.js"
```

---

### Finding Business Logic

**Core Files (TypeScript):**
- `src/analyzer/intelligent-analyzer.ts` - Intelligent codebase analysis
- `src/db/client.ts` - SQLite database operations
- `src/embeddings/openrouter.ts` - OpenRouter API integration
- `src/mcp.ts` - MCP server implementation
- `src/cli/index.ts` - CLI commands and REPL shell
- `src/config/models.ts` - Centralized model configuration
- `src/template-engine/` - Handlebars template system
- `src/template-sync/` - Template synchronization system
- `src/agent-system/` - TodoListManager, TimestampTracker
- `src/services/` - SnapshotManager and services
- `src/utils/chunking.ts` - Text chunking for large file embeddings
- `src/utils/encoding.ts` - UTF-8 BOM handling

---

### Finding Database Schema

**Models:** `src/db/schema.ts`
**Migrations:** `src/db/migrations/`
**Database:** SQLite at `.k0ntext.db`

---

### Finding External Integrations

- npm registry (publishing)
- GitHub Actions (CI/CD)
- Git hooks (automatic sync)
- OpenRouter API (embeddings and chat for intelligent analysis)

---

## System Architecture Mini-Map

```
k0ntext/
├── bin/                    # CLI entry point (k0ntext.js)
├── src/                    # TypeScript source
│   ├── agent-system/       # TodoListManager, TimestampTracker
│   ├── agents/             # Smart agents (Cleanup, Performance, Drift, FactCheck)
│   ├── analyzer/           # Intelligent codebase analysis
│   ├── cli/                # CLI commands, REPL shell, utilities
│   ├── config/             # Centralized model configuration
│   ├── db/                 # SQLite database client + migrations
│   ├── embeddings/         # OpenRouter integration
│   ├── services/           # SnapshotManager and services
│   ├── template-engine/    # Handlebars template system
│   ├── template-sync/      # Template synchronization
│   ├── utils/              # Utilities (chunking, encoding)
│   └── mcp.ts              # MCP server
├── agents/                 # Agent definitions (distributed with package)
├── skills/                 # RPI workflow skills
├── templates/              # Output templates + base templates for .claude/
│   ├── base/               # Templates synced to user .claude/ directories
│   └── map/                # Map-based context templates
├── tests/                  # Vitest tests
├── docs/                   # Documentation
└── .claude/                # Claude Code development context
    ├── agents/             # Agent definitions
    ├── commands/           # Command definitions
    └── schemas/            # JSON schemas
```

> **Note:** Template index files (indexes/, context/, workflows/) exist in `templates/base/` and are synced to user projects via `k0ntext init` and `k0ntext sync-templates`. They are not present in the repository's own `.claude/` directory.

---

## Critical Constants

### Domain & URLs
- npm package: `k0ntext`
- GitHub: `SireJeff/k0ntext`

### Business Constants
- Supported AI tools: Claude Code, GitHub Copilot, Cline, Antigravity, Windsurf, Aider, Continue, Cursor, Gemini
- Node.js minimum: 18.0.0
- Database file: `.k0ntext.db`
- Sync state stored in: `.k0ntext/sync-state.json`
- OpenRouter API key: `OPENROUTER_API_KEY` environment variable

---

## Quick Reference

**Understanding:** Review `src/` source modules, check `templates/base/` for context structure

**Implementing:** Check existing patterns in `src/cli/commands/`, follow TypeScript conventions

**Debugging:** Check Vitest output (`npm run test:run`), review src/ modules

---

## Agent & Command Routing

**Agents:** @context-engineer (setup), @core-architect (design), @api-developer (endpoints), @database-ops (schema), @integration-hub (external), @deployment-ops (CI/CD)
**Agent definitions:** [.claude/agents/](./.claude/agents/)

**Commands:** /rpi-research, /rpi-plan, /rpi-implement, /context-optimize, /verify-docs-current, /validate-all, /help, /collab, /analytics
**Command definitions:** [.claude/commands/](./.claude/commands/)

---

## Gotcha Quick Reference

### Testing
- Tests use Vitest with globals enabled
- Run all tests: `npm test`
- Run once without watch: `npm run test:run`

### Publishing
- Version must be bumped before npm publish
- CI/CD publishes automatically on GitHub release

### Database
- Migrations are in `src/db/migrations/files/`
- Schema version tracked in `src/db/schema.ts`
- Run `k0ntext migrate up` to apply pending migrations

---

## Documentation System

**Navigation:** CLAUDE.md serves as the primary entry point for Claude Code
**Validation:** Run /verify-docs-current [file_path] after modifications
**RPI Workflow:** /rpi-research -> /rpi-plan -> /rpi-implement

---

## Production

**Platform:** npm registry
**Services:** GitHub Actions CI/CD
**Monitoring:** npm download stats, GitHub issues

---

## Key Constraints

**Migrations:** SQLite migrations in `src/db/migrations/files/`
**Testing:** All PRs must pass Vitest tests
**Security:** No secrets in templates, validate user input paths

---

## Maintenance

**After changes:** Update relevant documentation -> Run tests -> Update CHANGELOG.md
**Docs:** `docs/` directory (QUICKSTART.md, MCP_QUICKSTART.md, TROUBLESHOOTING.md)

---

## Contact

- GitHub Issues: https://github.com/SireJeff/k0ntext/issues
- Author: SireJeff

---

**Version:** 3.8.0 | **Last Updated:** 2026-02-11 | **Context Target:** 200k
