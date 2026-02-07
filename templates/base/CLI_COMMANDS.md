# k0ntext CLI Commands Reference

Complete reference for all k0ntext v3.1.0 CLI commands.

## Quick Reference

| Command | Purpose | Use Case |
|---------|---------|----------|
| `k0ntext init` | Initialize project | First-time setup |
| `k0ntext generate` | Generate contexts | Add AI tools |
| `k0ntext mcp` | Start MCP server | For AI tools with MCP support |
| `k0ntext sync` | Sync contexts | After manual changes |
| `k0ntext cleanup` | Remove unused tools | When switching tools |
| `k0ntext validate` | Validate contexts | Before committing |
| `k0ntext export` | Export database | Backup or transfer |
| `k0ntext import` | Import context | Restore from backup |
| `k0ntext performance` | Show metrics | When system is slow |
| `k0ntext watch` | Auto-index files | During active development |
| `k0ntext drift-detect` | Detect drift | When code changes |
| `k0ntext cross-sync` | Cross-tool sync | After drift detected |
| `k0ntext hooks` | Git hooks | For automation |
| `k0ntext fact-check` | Validate docs | Quality assurance |
| `k0ntext index` | Index codebase | After adding files |
| `k0ntext search <query>` | Search content | Finding code/workflows |
| `k0ntext stats` | View statistics | Check indexing status |

---

## Detailed Commands

### Initialization Commands

#### `k0ntext init`

Initialize project with intelligent analysis.

```bash
k0ntext init [project-name]
k0ntext init --no-intelligent  # Skip OpenRouter analysis
```

**What it does:**
- Analyzes project structure and tech stack
- Discovers existing documentation and workflows
- Detects configured AI tools
- Initializes SQLite database
- Configures MCP server for supported AI tools

**When to use:**
- First-time setup for a new project
- When starting to use k0ntext on an existing project

**Output:**
- Database initialized at `.k0ntext.db`
- MCP server configured in `.claude/settings.json`
- Analysis results displayed

---

#### `k0ntext generate`

Generate context files for AI tools.

```bash
k0ntext generate
k0ntext generate --tools claude,cursor,continue
k0ntext generate --all
```

**What it does:**
- Generates context files for specified AI tools
- Populates templates with discovered information
- Creates tool-specific configurations

**When to use:**
- After running `k0ntext init`
- When adding support for new AI tools
- After making significant architectural changes

**Output:**
- Context files generated in tool-specific directories

---

#### `k0ntext mcp`

Start the MCP server for AI tools.

```bash
k0ntext mcp
k0ntext mcp --db .k0ntext.db
```

**What it does:**
- Starts the Model Context Protocol server
- Enables AI tools to query indexed content
- Provides semantic search capabilities

**When to use:**
- When using AI tools with MCP support (Claude Code, Cursor, Continue)
- For real-time context access during development

**Output:**
- MCP server running on stdio

---

### Synchronization Commands

#### `k0ntext sync`

Synchronize context across AI tools.

```bash
k0ntext sync
k0ntext sync --tools claude,cursor
k0ntext sync --force
```

**What it does:**
- Propagates context changes to all configured AI tools
- Ensures consistency across tool-specific directories
- Updates tool-specific configurations

**When to use:**
- After manually modifying context files
- After running `k0ntext generate`
- To ensure all tools have the latest context

**Output:**
- Sync status for each tool

---

#### `k0ntext cross-sync`

Intelligent cross-tool synchronization.

```bash
k0ntext cross-sync
k0ntext cross-sync --detect-drift
k0ntext cross-sync --fix
```

**What it does:**
- Detects differences between tool contexts
- Intelligently merges changes
- Resolves conflicts using AI

**When to use:**
- After `k0ntext drift-detect` identifies issues
- When manual edits have created inconsistencies
- Before major commits to ensure alignment

**Output:**
- Cross-sync report with conflicts resolved

---

### Validation Commands

#### `k0ntext validate`

Validate context files.

```bash
k0ntext validate
k0ntext validate --strict
k0ntext validate --fix
```

**What it does:**
- Checks context file structure
- Validates required fields
- Ensures link integrity

**When to use:**
- Before committing changes
- After modifying context files
- As part of CI/CD pipeline

**Output:**
- Validation report with errors and warnings

---

#### `k0ntext drift-detect`

AI-powered drift detection.

```bash
k0ntext drift-detect
k0ntext drift-detect --workflow authentication
k0ntext drift-detect --fix
```

**What it does:**
- Uses AI to compare documentation with code
- Detects outdated line references
- Identifies missing or incorrect documentation

**When to use:**
- After code changes
- Before documentation updates
- For regular maintenance checks

**Output:**
- Drift detection report with recommendations

---

#### `k0ntext fact-check`

Validate documentation accuracy.

```bash
k0ntext fact-check
k0ntext fact-check --file docs/api.md
k0ntext fact-check --strict
```

**What it does:**
- Validates documentation against current code
- Checks accuracy of statements
- Identifies potential errors or omissions

**When to use:**
- Quality assurance before releases
- After documentation updates
- For critical documentation verification

**Output:**
- Fact-check report with accuracy scores

---

### Database Commands

#### `k0ntext index`

Index codebase into database.

```bash
k0ntext index
k0ntext index --all
k0ntext index --docs
k0ntext index --code
k0ntext index --tools
k0ntext index --verbose
```

**What it does:**
- Discovers and indexes project files
- Generates embeddings for semantic search (with API key)
- Stores file metadata and content

**When to use:**
- After adding new files
- Before using semantic search
- For initial database population

**Output:**
- Indexing statistics (files discovered, indexed, embeddings generated)

---

#### `k0ntext search <query>`

Search indexed content.

```bash
k0ntext search "authentication flow"
k0ntext search "API endpoint" --type code
k0ntext search "database" --limit 20
k0ntext search "user" --mode semantic
k0ntext search "payment" --mode text
k0ntext search "webhook" --mode hybrid
```

**What it does:**
- Searches indexed codebase content
- Supports text, semantic, and hybrid search modes
- Returns ranked results with file paths

**When to use:**
- Finding related code or documentation
- Discovering patterns and implementations
- Locating workflow references

**Search Modes:**
- `text` - Pure keyword search
- `semantic` - Vector similarity search (requires API key)
- `hybrid` - Combined text and semantic (default)

**Output:**
- Ranked search results with file paths and relevance scores

---

#### `k0ntext stats`

View database statistics.

```bash
k0ntext stats
k0ntext stats --verbose
```

**What it does:**
- Displays database item counts
- Shows indexing statistics
- Lists database file location

**When to use:**
- Checking indexing status
- Verifying database health
- Understanding database size and contents

**Output:**
- Statistics table showing items, relations, commits, embeddings, tool configs

---

### Utility Commands

#### `k0ntext export`

Export database to file.

```bash
k0ntext export
k0ntext export --file backup.json
k0ntext export --format json
```

**What it does:**
- Exports entire database to JSON file
- Includes all indexed items, embeddings, and metadata
- Creates portable backup

**When to use:**
- Creating backups before major changes
- Transferring context between projects
- Sharing context with team members

**Output:**
- JSON file with complete database export

---

#### `k0ntext import`

Import context from file.

```bash
k0ntext import
k0ntext import --file backup.json
k0ntext import --merge
```

**What it does:**
- Imports database from JSON file
- Restores indexed content and embeddings
- Optionally merges with existing data

**When to use:**
- Restoring from backup
- Loading context shared by team
- Migrating between projects

**Output:**
- Import statistics with items added

---

#### `k0ntext cleanup`

Remove unused AI tool folders.

```bash
k0ntext cleanup
k0ntext cleanup --dry-run
k0ntext cleanup --keep claude,cursor
```

**What it does:**
- Identifies unused AI tool directories
- Removes stale configuration files
- Cleans up orphaned context files

**When to use:**
- When switching between AI tools
- Removing tools no longer in use
- General cleanup and maintenance

**Output:**
- Cleanup report with folders removed

---

#### `k0ntext performance`

Show performance metrics.

```bash
k0ntext performance
k0ntext performance --detailed
```

**What it does:**
- Displays system performance metrics
- Shows database query times
- Identifies bottlenecks

**When to use:**
- When system is slow
- Optimizing performance
- Debugging issues

**Output:**
- Performance metrics report

---

#### `k0ntext watch`

Auto-index on file changes.

```bash
k0ntext watch
k0ntext watch --debounce 1000
k0ntext watch --include "src/**/*"
```

**What it does:**
- Watches for file changes
- Automatically reindexes modified files
- Runs in background during development

**When to use:**
- During active development
- For continuous index updates
- When frequently modifying files

**Output:**
- Watch status with file changes detected

---

#### `k0ntext hooks`

Git hooks management.

```bash
k0ntext hooks install
k0ntext hooks uninstall
k0ntext hooks list
```

**What it does:**
- Installs git hooks for automation
- Configures pre-commit validation
- Enables automatic context updates

**When to use:**
- Setting up automation
- Enforcing validation on commits
- For team-wide consistency

**Output:**
- Hook installation status

---

## Command Categories

### Setup Commands
- `k0ntext init` - Initialize project
- `k0ntext generate` - Generate contexts
- `k0ntext mcp` - Start MCP server

### Sync Commands
- `k0ntext sync` - Sync contexts
- `k0ntext cross-sync` - Cross-tool sync
- `k0ntext cleanup` - Remove unused tools

### Validation Commands
- `k0ntext validate` - Validate contexts
- `k0ntext drift-detect` - Detect drift
- `k0ntext fact-check` - Validate accuracy

### Database Commands
- `k0ntext index` - Index codebase
- `k0ntext search` - Search content
- `k0ntext stats` - View statistics

### Utility Commands
- `k0ntext export` - Export database
- `k0ntext import` - Import database
- `k0ntext performance` - Show metrics
- `k0ntext watch` - Auto-index
- `k0ntext hooks` - Git hooks

---

## Integration with AI Tools

### Claude Code
- MCP server: `k0ntext mcp`
- Config file: `.claude/settings.json`
- Auto-configured by: `k0ntext init`

### Cursor
- MCP server: `k0ntext mcp`
- Config file: `.cursor/mcp.json`
- Manual setup required

### Continue
- MCP server: `k0ntext mcp`
- Config file: `.continue/config.json`
- Manual setup required

### Other Tools
- Windsurf, Cline, Gemini, Aider, Antigravity, Copilot
- Context file generation only
- No MCP support

---

## Common Workflows

### First-Time Setup
```bash
k0ntext init          # Initialize project
k0ntext index --all   # Index all files
k0ntext stats         # Verify indexing
k0ntext mcp           # Start MCP server
```

### Daily Development
```bash
k0ntext watch         # Start auto-indexing
# ... make changes ...
k0ntext drift-detect  # Check for drift
k0ntext validate      # Validate before commit
```

### Adding AI Tool
```bash
k0ntext generate --tools claude,cursor  # Generate contexts
k0ntext sync                           # Sync across tools
k0ntext validate                       # Validate setup
```

### Team Collaboration
```bash
k0ntext export --file team-context.json  # Export for team
k0ntext import --file team-context.json  # Import from team
k0ntext cross-sync                       # Sync changes
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key for intelligent analysis | - |
| `K0NTEXT_PROJECT_ROOT` | Project root path (auto-set) | `cwd` |
| `K0NTEXT_DB_PATH` | Database file path | `.k0ntext.db` |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.k0ntext.db` | SQLite database |
| `.claude/settings.json` | Claude Code settings (includes MCP config) |
| `.k0ntext/sync-state.json` | Sync state tracking |
| `.git/hooks/pre-commit` | Git hooks (if installed) |

---

## Version

**k0ntext:** v3.1.0

**Documentation Last Updated:** 2026-02-08
