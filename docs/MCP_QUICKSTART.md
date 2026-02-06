# K0ntext - MCP Server Quick Start

Connect the K0ntext MCP server to Claude Desktop (or other MCP-compatible AI assistants) to give your AI intelligent access to your codebase.

## What is MCP?

The Model Context Protocol (MCP) is a standard for AI assistants to access external tools and data. With K0ntext's MCP server, your AI can:

- Search your codebase semantically
- Retrieve specific files and context
- Query the knowledge graph
- Run intelligent analysis
- Check documentation drift

## Prerequisites

1. **K0ntext installed:**
   ```bash
   npm install -g k0ntext
   ```

2. **Claude Desktop** (or another MCP-compatible client)

3. **A project initialized with K0ntext:**
   ```bash
   cd your-project
   k0ntext init
   ```

## Setup with Claude Desktop

### Step 1: Find Your Claude Config

The config location depends on your OS:

| Platform | Config Path |
|----------|-------------|
| macOS    | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows  | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux    | `~/.config/Claude/claude_desktop_config.json` |

### Step 2: Add K0ntext MCP Server

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "k0ntext": {
      "command": "npx",
      "args": [
        "-y",
        "k0ntext",
        "mcp"
      ],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**Important:** Replace `/path/to/your/project` with your actual project path.

#### Multiple Projects

For multiple projects, use different server names:

```json
{
  "mcpServers": {
    "k0ntext-project-a": {
      "command": "npx",
      "args": ["-y", "k0ntext", "mcp"],
      "cwd": "/path/to/project-a"
    },
    "k0ntext-project-b": {
      "command": "npx",
      "args": ["-y", "k0ntext", "mcp"],
      "cwd": "/path/to/project-b"
    }
  }
}
```

### Step 3: Restart Claude Desktop

Completely quit and restart Claude Desktop.

### Step 4: Verify Connection

In a new Claude conversation, you should see **k0ntext** listed in the available MCP tools.

## Available MCP Tools

The K0ntext MCP server provides these tools:

| Tool | Description |
|------|-------------|
| `search_context` | Semantic search across indexed content |
| `get_item` | Retrieve specific context items by ID |
| `add_knowledge` | Store insights and facts |
| `analyze` | Run intelligent codebase analysis |
| `get_tool_configs` | View AI tool configurations |
| `query_graph` | Traverse knowledge graph |
| `get_stats` | Database statistics |
| `add_relation` | Add relationships between items |
| `find_path` | Find paths between items |
| `run_drift_check` | Check documentation sync |

## Usage Examples

### Semantic Search

Ask Claude:
> "Search my codebase for how authentication is implemented"

Claude will use `search_context` to find relevant code.

### Get Specific Item

Ask Claude:
> "Get the item with ID abc123"

### Add Knowledge

Ask Claude:
> "Add to my knowledge base: The authentication system uses JWT tokens with a 1-hour expiration"

### Run Analysis

Ask Claude:
> "Run an intelligent analysis of my codebase"

## Troubleshooting

### MCP Server Not Appearing

1. **Check config path:** Ensure you're editing the correct config file
2. **Restart Claude:** Completely quit and restart Claude Desktop
3. **Check project path:** Verify `cwd` points to a valid project with `.k0ntext.db`
4. **Check logs:** Look for MCP errors in Claude's developer console

### Database Not Found

```
Error: Database file not found: .k0ntext.db
```

**Solution:** Run `k0ntext init` in your project directory first.

### OpenRouter API Key Missing

If using intelligent analysis:

```
Error: OPENROUTER_API_KEY not set
```

**Solution:** Set your API key:
```bash
export OPENROUTER_API_KEY="your-key-here"
```

Or add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.).

### Port Already in Use

```
Error: Port 3000 already in use
```

**Solution:** The MCP server uses stdio (not HTTP), so this shouldn't occur. If it does, ensure no other MCP servers are configured with the same name.

## Advanced Configuration

### Custom Server Port (Future)

The current MCP server uses stdio transport. HTTP/SSE transport may be added in the future.

### Environment Variables

Available environment variables for the MCP server:

```bash
# Database location
export K0NTEXT_DB_PATH="/custom/path/.k0ntext.db"

# OpenRouter API key (for intelligent analysis)
export OPENROUTER_API_KEY="your-key-here"

# Log level
export K0NTEXT_LOG_LEVEL="debug"  # debug, info, warn, error
```

## MCP Prompts

K0ntext also provides **6 prompts** for Claude:

| Prompt | Description |
|--------|-------------|
| `analyze-codebase` | Analyze the entire codebase |
| `find-similar-code` | Find code similar to a pattern |
| `explain-architecture` | Explain system architecture |
| `review-changes` | Review recent code changes |
| `suggest-improvements` | Suggest code improvements |
| `check-drift` | Check documentation drift |

These prompts can be invoked directly from Claude Desktop.

## Next Steps

- **Full Documentation:** https://github.com/SireJeff/k0ntext
- **Troubleshooting:** [Troubleshooting Guide](TROUBLESHOOTING.md)
- **MCP Specification:** https://modelcontextprotocol.io

## Support

- **Issues:** https://github.com/SireJeff/k0ntext/issues
- **Discussions:** https://github.com/SireJeff/k0ntext/discussions
