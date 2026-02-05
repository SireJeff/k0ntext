# AI Context - Quick Start Guide

Get up and running with AI Context in 5 minutes.

## Installation

```bash
npm install -g ai-context
```

**Requirements:** Node.js 18 or higher

## Initialize Your Project

Navigate to your project directory and run:

```bash
cd your-project
ai-context init
```

This will:
1. Analyze your codebase (intelligent analysis powered by OpenRouter)
2. Create a SQLite database at `.ai-context.db`
3. Index your source code with semantic embeddings
4. Generate optimized context files for your AI tools

### Skip Intelligent Analysis (Optional)

If you want to skip the OpenRouter-powered intelligent analysis:

```bash
ai-context init --no-intelligent
```

This will use a faster static analysis instead.

## Generate Context Files

To regenerate context files for all AI tools:

```bash
ai-context generate
```

## Start MCP Server

The MCP (Model Context Protocol) server provides AI assistants with tools to query your codebase:

```bash
ai-context mcp
```

See [MCP Quick Start](MCP_QUICKSTART.md) for setup instructions.

## Other Commands

```bash
ai-context index          # Index codebase into database
ai-context search <query> # Semantic search across code
ai-context sync           # Sync context across AI tools
ai-context stats          # Database statistics
```

## What Gets Created

After initialization, you'll find:

```
your-project/
├── .ai-context.db          # SQLite database (embeddings + metadata)
├── .ai-context/            # Generated contexts
│   ├── AI_CONTEXT.md       # For Claude/Cursor/etc
│   └── sync-state.json     # Cross-tool sync state
├── .github/copilot-instructions.md  # For GitHub Copilot
├── .clinerules             # For Cline
├── .cursorrules            # For Cursor
└── ...more tool configs
```

## Next Steps

1. **Configure Claude Desktop with MCP** → [MCP Quick Start](MCP_QUICKSTART.md)
2. **Learn about cross-tool sync** → [Migration Guide](MIGRATE_TO_UNIFIED.md)
3. **Troubleshoot issues** → [Troubleshooting](TROUBLESHOOTING.md)

## How It Works

AI Context uses a three-phase process:

1. **Analysis Phase** (optional):
   - OpenRouter API analyzes your entire codebase
   - Identifies patterns, tech stack, and architecture
   - Provides AI-powered insights for better context

2. **Indexing Phase**:
   - Files are scanned and change-detected (SHA256)
   - Content is embedded with OpenRouter embeddings
   - Stored in SQLite with sqlite-vec for vector search

3. **Generation Phase**:
   - Context files are generated for 9+ AI tools
   - Cross-tool sync state is tracked
   - Optimized prompts are created for each tool

## Environment Variables

```bash
# Optional: For intelligent analysis
export OPENROUTER_API_KEY="your-key-here"

# Optional: Specify which AI tools to generate for
export AI_CONTEXT_TOOLS="claude,copilot,cline"
```

## Support

- **Issues:** https://github.com/SireJeff/ai-context/issues
- **Docs:** https://github.com/SireJeff/ai-context
