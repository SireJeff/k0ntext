# K0ntext - Copilot Instructions

## Project Overview

This is the **k0ntext** package (v3.8.0) - a unified AI context engineering tool that provides intelligent context for Claude Code, GitHub Copilot, Cline, Cursor, Windsurf, Aider, Continue, Antigravity, and Gemini.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **Database:** SQLite + sqlite-vec (vector embeddings)
- **MCP:** Model Context Protocol server
- **AI:** OpenRouter API for intelligent analysis and embeddings
- **Testing:** Vitest
- **CLI:** Commander.js

## Project Structure

```
k0ntext/
├── src/                    # TypeScript source code
│   ├── agent-system/       # TodoListManager, TimestampTracker
│   ├── agents/             # Smart agents (Cleanup, Performance, Drift, FactCheck)
│   ├── analyzer/           # Intelligent codebase analysis
│   ├── cli/                # CLI commands and REPL shell
│   ├── config/             # Centralized model configuration
│   ├── db/                 # SQLite database client and migrations
│   ├── embeddings/         # OpenRouter integration
│   ├── services/           # SnapshotManager and services
│   ├── template-engine/    # Handlebars template system
│   ├── template-sync/      # Template synchronization
│   ├── utils/              # Utilities (chunking, encoding)
│   └── mcp.ts              # MCP server
├── bin/                    # CLI entry point
├── agents/                 # AI agent definitions
├── skills/                 # RPI workflow skills
├── templates/              # Context templates
├── tests/                  # Vitest tests
└── docs/                   # Documentation
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript to `dist/` |
| `npm test` | Run test suite (watch mode) |
| `npm run test:run` | Run tests once |
| `npm run lint` | Run ESLint |

## Core Features

1. **Intelligent Analysis** - OpenRouter-powered codebase understanding
2. **Semantic Search** - Vector database with embeddings
3. **MCP Server** - 10 tools + 6 prompts for AI assistants
4. **Cross-Tool Sync** - Synchronize context across 9 AI tools
5. **Interactive REPL Shell** - Auto-starts when running `k0ntext` with no arguments
6. **Template Sync** - Keeps `.claude/` directory up-to-date with package templates
7. **Database Snapshots** - Create, restore, diff, and manage database snapshots
8. **Drift Detection** - AI-powered documentation drift detection
9. **Git Hooks** - Automatic context maintenance on commits

## CLI Commands

When users install `k0ntext`, they can run:

| Command | Description |
|---------|-------------|
| `k0ntext init` | Initialize with intelligent analysis |
| `k0ntext generate` | Generate context files for all tools |
| `k0ntext mcp` | Start MCP server |
| `k0ntext sync` | Sync across AI tools |
| `k0ntext index` | Index codebase into database |
| `k0ntext search` | Semantic search across content |
| `k0ntext stats` | Database statistics |
| `k0ntext check` | Check if context files are outdated |
| `k0ntext restore` | Restore AI tool configs from backups |
| `k0ntext cleanup` | Clean up other AI tool folders |
| `k0ntext validate` | Validate context files |
| `k0ntext drift-detect` | AI-powered drift detection |
| `k0ntext cross-sync` | Sync across all AI tools |
| `k0ntext hooks` | Git hooks management |
| `k0ntext fact-check` | Validate documentation accuracy |
| `k0ntext sync-templates` | Sync `.claude/` templates |
| `k0ntext template-status` | Show template sync status |
| `k0ntext snapshot` | Create/restore database snapshots |
| `k0ntext migrate` | Manage database migrations |
| `k0ntext watch` | Auto-index file changes |
| `k0ntext export` | Export database |
| `k0ntext import` | Import from exports |
| `k0ntext performance` | Show performance metrics |

## MCP Server Tools

The MCP server provides these tools:
- `search_context` - Semantic search
- `get_item` - Retrieve context items
- `add_knowledge` - Store insights
- `analyze` - Run intelligent analysis
- `get_tool_configs` - View AI tool configs
- `query_graph` - Traverse knowledge graph
- `get_stats` - Database statistics
- `add_relation` - Add relationships
- `find_path` - Find paths
- `run_drift_check` - Check documentation sync

## Development Guidelines

When contributing to `k0ntext`:

1. **TypeScript** - All source is in TypeScript
2. **Async/Await** - Use async/await for database operations
3. **Error Handling** - Provide clear error messages
4. **Testing** - Write tests for new features (Vitest)
5. **Documentation** - Update README and docs/

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `better-sqlite3` - SQLite database
- `sqlite-vec` - Vector embeddings
- `commander` - CLI framework
- `zod` - Schema validation
- `handlebars` - Template engine
- `ora` - Spinner/progress indicators

## Entry Points

- **CLI:** `bin/k0ntext.js` -> `dist/cli/index.js`
- **MCP:** `dist/mcp.js`
- **Main:** `dist/index.js`

## Database

- **File:** `.k0ntext.db` (SQLite)
- **Schema:** `src/db/schema.ts`
- **Client:** `src/db/client.ts`
- **Migrations:** `src/db/migrations/`

## Copilot Behavior

When generating code for this project:
- Follow TypeScript best practices
- Use JSDoc for function documentation
- Handle errors gracefully
- Consider cross-platform compatibility (Windows/macOS/Linux)
- Use Vitest for new test files
- Follow existing patterns in `src/` directory
