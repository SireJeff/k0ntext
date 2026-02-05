# AI Context - Copilot Instructions

## Project Overview

This is the **ai-context** package - a unified AI context engineering tool that provides intelligent context for Claude, GitHub Copilot, Cline, Cursor, and other AI coding assistants.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **Database:** SQLite + sqlite-vec (vector embeddings)
- **MCP:** Model Context Protocol server
- **AI:** OpenRouter API for intelligent analysis

## Project Structure

```
ai-context/
├── src/                    # TypeScript source code
│   ├── analyzer/          # Intelligent codebase analysis
│   ├── cli/               # CLI commands
│   ├── db/                # SQLite database client
│   ├── embeddings/        # OpenRouter integration
│   └── mcp.ts             # MCP server
├── bin/                   # CLI entry point
├── agents/                # AI agent definitions
├── skills/                # RPI workflow skills
├── templates/             # Context templates
├── tests/                 # Vitest tests
└── docs/                  # Documentation
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript to `dist/` |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |

## Core Features

1. **Intelligent Analysis** - OpenRouter-powered codebase understanding
2. **Semantic Search** - Vector database with embeddings
3. **MCP Server** - 10 tools + 6 prompts for AI assistants
4. **Cross-Tool Sync** - Synchronize context across 9 AI tools
5. **CLI** - 7 commands for context management

## CLI Commands

When users install `ai-context`, they can run:
- `ai-context init` - Initialize with intelligent analysis
- `ai-context generate` - Generate context files
- `ai-context sync` - Sync across AI tools
- `ai-context mcp` - Start MCP server
- `ai-context index` - Index codebase
- `ai-context search` - Semantic search
- `ai-context stats` - Database statistics

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

When contributing to `ai-context`:

1. **TypeScript** - All source is in TypeScript
2. **Async/Await** - Use async/await for database operations
3. **Error Handling** - Provide clear error messages
4. **Testing** - Write tests for new features
5. **Documentation** - Update README and docs/

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `better-sqlite3` - SQLite database
- `sqlite-vec` - Vector embeddings
- `openrouter` API - Intelligent analysis
- `commander` - CLI framework
- `zod` - Schema validation

## Entry Points

- **CLI:** `bin/ai-context.js` → `dist/cli/index.js`
- **MCP:** `dist/mcp.js`
- **Main:** `dist/index.js`

## Database

- **File:** `.ai-context.db` (SQLite)
- **Schema:** `src/db/schema.ts`
- **Client:** `src/db/client.ts`

## Copilot Behavior

When generating code for this project:
- Follow TypeScript best practices
- Use JSDoc for function documentation
- Handle errors gracefully
- Consider cross-platform compatibility (Windows/macOS/Linux)
