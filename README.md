# K0ntext

[![npm version](https://img.shields.io/npm/v/k0ntext.svg)](https://www.npmjs.com/package/k0ntext)
[![npm downloads](https://img.shields.io/npm/dt/k0ntext.svg)](https://www.npmjs.com/package/k0ntext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/SireJeff/k0ntext/workflows/CI/badge.svg)](https://github.com/SireJeff/k0ntext/actions)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)

Universal AI context engineering for Claude, GitHub Copilot, Cline, Cursor, Windsurf, Aider, Continue, Antigravity, and Gemini with OpenRouter-powered intelligent analysis.

## Table of Contents

- [Quick Start](#-quick-start-30-seconds)
- [Zero-to-Hero Workflow](#-zero-to-hero-workflow)
- [Windows Support](#-windows-support)
- [Features Overview](#-features-overview)
  - [Interactive REPL Shell](#-interactive-repl-shell-v330)
  - [Enhanced TUI Panels](#-enhanced-tui-panels-v331)
  - [Intelligent Analysis](#-intelligent-analysis)
  - [Semantic Search](#-semantic-search)
  - [Cross-Tool Sync](#-cross-tool-sync)
  - [Git Hooks Automation](#-git-hooks-automation-v310)
  - [Drift Detection](#-drift-detection-v310)
  - [Fact-Checking](#-fact-checking-v310)
  - [Map-Based Context](#-map-based-context-v310)
  - [MCP Server](#-mcp-server)
  - [Complete CLI](#-complete-cli-18-commands)
  - [Smart Agents](#-smart-agents)
  - [SQLite Storage](#-sqlite-storage)
- [Complete CLI Reference](#-complete-cli-reference)
  - [Core Commands](#core-commands)
  - [v3.1.0 New Commands](#v310-new-commands)
  - [Git Hooks Workflow](#-git-hooks-workflow-v310)
- [MCP Server Usage](#-mcp-server-usage)
- [Supported AI Tools](#-supported-ai-tools)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Development](#-development)
- [Performance Monitoring](#-performance-monitoring)
- [Troubleshooting](#-troubleshooting)
- [Community](#-community)

---

## 🚀 Quick Start (30 Seconds)

```bash
# Install globally
npm install -g k0ntext

# Initialize your project with intelligent analysis
k0ntext init

# Generate context files for all AI tools
k0ntext generate

# Start the MCP server for AI tools
k0ntext mcp
```

## 🎯 Zero-to-Hero Workflow

### New Project Setup
```bash
# 1. Initialize with intelligent analysis
k0ntext init --intelligent

# 2. Index your codebase
k0ntext index

# 3. Generate context files
k0ntext generate

# 4. Start MCP server (auto-configured)
k0ntext mcp
```

### Existing Project Setup
```bash
# 1. Check existing context
k0ntext stats

# 2. Index codebase if needed
k0ntext index --docs --code

# 3. Generate missing tool configs
k0ntext generate --force

# 4. Validate everything
k0ntext validate --strict
```

## 🖥️ Windows Support

K0ntext uses native SQLite extensions for high-performance vector search.

**For Windows Users:**
- **Recommended:** Use Node.js LTS (v18, v20, v22) with pre-built binaries
- **Instant install:** These versions install without extra tools
- **Non-LTS versions (v23/v24):** May require [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) to compile the database driver

## ✨ Features Overview

### 🖥️ Interactive REPL Shell (v3.3.0)
- **Auto-start**: Running `k0ntext` with no arguments launches the interactive shell
- **Session persistence**: Command history and statistics saved across sessions
- **Built-in commands**: help, stats, index, search, config, drift, init, update, exit
- **Orange gradient theme** with Unicode/ASCII fallback and terminal capability detection
- **Update checker** with automatic version notifications on startup

### 🎨 Enhanced TUI Panels (v3.3.1)
- **Advanced Search Panel** - Filtered, sortable search with `--type`, `--sort`, `--limit` flags and content previews
- **Configuration UI** - Interactive editor with 4 categories (Project, AI Tools, Features, Display)
- **Indexing Progress** - Real-time multi-stage progress visualization with ora spinner
- **Drift Detection** - Three-axis analysis (file dates, structure, git diff) with severity-coded reporting

### 🧠 Intelligent Analysis
- OpenRouter-powered codebase analysis with embeddings
- Tech stack detection and documentation
- Workflow discovery and categorization
- Automatic context generation
- **Centralized model configuration** (v3.1.0) - Single source of truth for all AI operations

### 🔍 Semantic Search
- Vector database (sqlite-vec) for intelligent code retrieval
- Hybrid search (text + semantic)
- Content type filtering (workflow, agent, command, code, doc, etc.)
- Real-time indexing with watch mode

### 🔄 Cross-Tool Sync
- **9 AI Tools Supported:** Claude, Copilot, Cline, Antigravity, Windsurf, Aider, Continue, Cursor, Gemini
- Automatic synchronization between tool configurations
- Change detection with SHA256 hashing
- Sync status monitoring
- **Intelligent cross-sync** (v3.1.0) - AI-powered propagation of changes across tools

### 🤖 Git Hooks Automation (v3.1.0)
- **Pre-commit workflow** - Automatic context maintenance
- Drift detection on every commit
- Automatic cross-sync when drift detected
- Updated context files auto-added to commits

### 🎯 Drift Detection (v3.1.0)
- **AI-powered semantic analysis** - Detect when documentation diverges from code
- Replaces hash-based checks with intelligent understanding
- Severity-based reporting (high/medium/low)
- Automatic fix suggestions

### 📋 Fact-Checking (v3.1.0)
- Validate documentation accuracy against codebase
- Identify outdated APIs, wrong file paths, missing dependencies
- Confidence scoring for each claim

### 🗺️ Map-Based Context (v3.1.0)
- Concise, structured context files
- Reduce hallucination through precise references
- Alternative to verbose documentation format

### 🔢 Version Detection (v3.4.0)
- **Automatic version checking** - Detects outdated context files
- **Semantic version parsing** - Supports 5 version marker formats
- **Update type indicators** - Major/minor/patch with emoji (🚨/✨/🔧)
- **Database tracking** - Stores version history and check timestamps
- **Integrated into init** - `k0ntext check` command and `--no-version-check` option

### 📝 User Modification Handling (v3.4.0)
- **SHA-256 hash detection** - Detects when users edit generated files
- **Automatic backup creation** - Creates backups before overwriting modified files
- **Dual backup strategy** - File-copy with git-stash fallback
- **Interactive prompts** - Asks user before overwriting custom changes
- **Restore system** - `k0ntext restore` command for backup recovery

### 🎨 Template Engine Enhancement (v3.4.0)
- **Handlebars integration** - Rich template-based content generation
- **15 custom helpers** - join, first, truncate, slugify, formatDate, eq, ne, and, or, defaults, json, keys, values, length
- **Rich project data** - Generated files include actual project metadata
- **Graceful fallback** - Inline functions when templates unavailable

### 🔄 Template Sync System (v3.5.0)
- **Automatic `.claude/` sync** - Syncs commands/, agents/, schemas/, standards/, tools/, automation/ from package
- **Hash-based change detection** - SHA-256 (16 char) for consistency with DatabaseClient
- **File state classification** - identical, safe-update, conflict, new, deleted, user-only
- **Auto-merge strategies** - Safe updates automatically applied, conflicts prompt user
- **Interactive conflict resolution** - Show diff, keep-local, overwrite, or skip options
- **Batch resolution** - Keep-all, overwrite-all, or individual for multiple conflicts
- **Backup before overwrite** - Automatic backups to `.k0ntext/backups/`
- **Archive removed files** - Moved to `.k0ntext/archive/` with timestamp
- **Dual manifest tracking** - Database + file (`.claude/.k0ntext-manifest.json`)
- **Init integration** - Runs automatically during `k0ntext init` (skip with `--no-template-sync`)

### 🤖 MCP Server
- **Auto-Configuration** (v3.1.1) - MCP server automatically configured in `.claude/settings.json` on init
- **10 Tools:** search_context, get_item, add_knowledge, analyze, get_tool_configs, query_graph, get_stats
- **6 Prompts:** context-engineer, core-architect, api-developer, database-ops, integration-hub, deployment-ops
- Real-time context access for AI assistants
- Knowledge graph traversal

### 🛠️ Complete CLI (22 Commands)
- `init` - Initialize with intelligent analysis **(auto-configures MCP in v3.1.1)**
- `generate` - Generate context files for all tools
- `mcp` - Start MCP server
- `sync` - Sync across AI tools
- `cleanup` - Clean up conflicting tool folders
- `validate` - Validate context files
- `export` - Export database
- `import` - Import from exports
- `performance` - Show performance metrics
- `watch` - Auto-index file changes
- `index` - Index codebase
- `search` - Search indexed content
- `stats` - View database statistics
- **`check`** - Check if context files are outdated (v3.4.0)
- **`restore`** - Restore AI tool config files from backups (v3.4.0)
- **`sync-templates`** - Sync `.claude/` templates from package (v3.5.0)
- **`template-status`** - Show template sync status (v3.5.0)
- **`drift-detect`** - AI-powered documentation drift detection (v3.1.0)
- **`cross-sync`** - Intelligent sync across all AI tools (v3.1.0)
- **`hooks`** - Git hooks management (install/uninstall/status) (v3.1.0)
- **`fact-check`** - Validate documentation accuracy (v3.1.0)
- `generate --map` - Generate concise map-based context files (v3.1.0)

### 📊 Smart Agents
- **CleanupAgent** - Remove conflicting AI tool folders (.cursor, .windsurf, .cline, etc.)
- **PerformanceMonitorAgent** - Track database performance and suggest optimizations
- **DriftAgent** (v3.1.0) - AI-powered documentation drift detection
- **FactCheckAgent** (v3.1.0) - Validate documentation accuracy against codebase

### 🗃️ SQLite Storage
- Persistent database with SHA256 change detection
- Embeddings support for semantic search
- Knowledge graph relationships
- Automatic schema migrations

## 🆕 v3.5.0 - Template Sync System

### Smart Template Management

K0ntext v3.5.0 introduces a comprehensive template sync system that automatically keeps your `.claude/` directory up-to-date with the latest package templates while preserving your customizations.

**Key Features:**
- ✅ **Automatic sync on init** - Templates are synced during `k0ntext init`
- ✅ **User modification detection** - Detects files you've customized
- ✅ **Interactive conflict resolution** - Choose to keep your changes or use templates
- ✅ **Hash-based comparison** - Efficient SHA-256 change detection
- ✅ **Backup before overwrites** - Automatic backups to `.k0ntext/backups/`
- ✅ **Dry-run mode** - Preview changes before applying them
- ✅ **Selective sync** - Sync specific directories (commands, agents, etc.)

### How It Works

1. **First init** - Creates all 55 template files (agents, commands, schemas, standards, tools)
2. **You modify files** - Your customizations are tracked
3. **Re-run init** - Detects your modifications and prompts for resolution
4. **Force sync** - Use `--force` to auto-overwrite with templates

### User Modification Detection

The system intelligently detects when you've modified template files:

```bash
# You customize a file
echo "# My custom notes" >> .claude/commands/analytics.md

# Re-run init - detects modification
k0ntext init

# Output:
# ⚠ 1 conflict(s) detected:
#   ⚠ commands/analytics.md [modified]
#
# File: commands/analytics.md
# State: Modified in both template and locally
#   ⚠ You have modified this file
#  Template hash: 375ec9c90c168811
#  Local hash: ee727b7a1a20a0c2
# ? How would you like to resolve this?
#   Show diff
# ❯ Keep local version
#   Overwrite with template
#   Skip for now
```

### New Commands

```bash
# Sync templates and handle conflicts
k0ntext sync-templates              # Interactive mode
k0ntext sync-templates --dry-run     # Preview changes
k0ntext sync-templates --force        # Auto-overwrite conflicts
k0ntext sync-templates --verbose      # Show detailed diffs

# Check sync status
k0ntext template-status              # Quick status check
k0ntext template-status --verbose    # Detailed file listings

# Skip template sync during init
k0ntext init --no-template-sync
```

### Bug Fixes in v3.5.0

- ✅ **Fixed user modification detection** - Now detects changes made after initial sync
- ✅ **Fixed force sync** - `--force` now actually overwrites conflict files
- ✅ **Fixed path resolution** - Templates are correctly found from compiled JavaScript
- ✅ **Fixed conflict tracking** - Resolved conflicts are properly excluded from counts

### Template Files Synced

| Directory | Files | Description |
|-----------|-------|-------------|
| `commands/` | 12 | Slash command definitions |
| `agents/` | 6 | AI agent configurations |
| `schemas/` | 14 | JSON schemas for validation |
| `standards/` | 4 | Coding standards |
| `tools/` | 3 | Tool-specific configurations |
| `automation/` | 1 | Automation settings |
| **Total** | **40** | **Excluded:** `context/`, `indexes/` (user-specific) |

---

## 🆕 v3.7.0 - Bug Fixes & Improvements

### Critical Fixes

- ✅ **UTF-8 BOM handling** - Fixed OpenRouter API key detection on Windows when `.env` files have UTF-8 Byte Order Mark
- ✅ **Large file embeddings** - Files >8K tokens now automatically chunk for embedding generation
- ✅ **Database version tracking** - New migration (0015) adds version tracking to `sync_state` table
- ✅ **Migrate command visibility** - Fixed `k0ntext migrate` command visibility in help output

### What's Fixed

| Issue | Fix |
|-------|-----|
| **Windows .env BOM** | Strip UTF-8 BOM (EF BB BF) from environment variables before using API keys |
| **Large docs failing** | Auto-chunk files >8K tokens with 100-token overlap for context preservation |
| **Migrate not showing** | Added default action handler to show subcommands |

### New Features

- **Text chunking utility** (`src/utils/chunking.ts`) - Split large texts intelligently with word boundary detection
- **BOM stripping utility** (`src/utils/encoding.ts`) - Handle UTF-8 BOM in environment files

### Database Migration

Run `k0ntext migrate up` to apply migration 0015:
```bash
k0ntext migrate up
```

This adds `k0ntext_version`, `user_modified`, and `last_checked` columns to the `sync_state` table for better version tracking.

### Upgrade

```bash
npm install -g k0ntext@latest
```

---

## 📖 Complete CLI Reference

### Core Commands

#### `k0ntext init [project-name]`
Initialize AI context for a project with intelligent analysis.

```bash
# Initialize current directory
k0ntext init

# Initialize specific project
k0ntext init my-project

# Skip intelligent analysis (faster)
k0ntext init --no-intelligent
```

**Options:**
- `--no-intelligent` - Skip OpenRouter-powered analysis
- `--no-version-check` - Skip version checking for outdated context files (v3.4.0)
- `--no-template-sync` - Skip template synchronization (v3.5.0)
- `-v, --verbose` - Show detailed output

#### `k0ntext generate`
Generate context files for all AI tools.

```bash
# Generate for all tools
k0ntext generate

# Generate for specific tools
k0ntext generate -ai claude,copilot,cursor

# Force regenerate all files
k0ntext generate --force

# Verbose output
k0ntext generate -v
```

**Options:**
- `-ai, --ai <tools>` - Specific tools (comma-separated)
- `--force` - Force regenerate all files
- `--map` - Use concise map-based format (new in v3.1.0)
- `-v, --verbose` - Show detailed output

#### `k0ntext mcp`
Start the Model Context Protocol server.

```bash
# Start with default database
k0ntext mcp

# Specify database path
k0ntext mcp --db .my-context.db
```

**Options:**
- `--db <path>` - Database file path

#### `k0ntext sync`
Synchronize context across AI tools.

```bash
# Sync all tools
k0ntext sync

# Check sync status only
k0ntext sync --check

# Sync from specific tool
k0ntext sync --from claude

# Sync to specific tool
k0ntext sync --to copilot

# Force sync
k0ntext sync --force
```

**Options:**
- `--check` - Only check synchronization status
- `--from <tool>` - Sync from specific tool
- `--to <tool>` - Sync to specific tool
- `--force` - Force sync even if up-to-date

#### `k0ntext cleanup`
Clean up context folders from other AI tools.

```bash
# Dry run to see what would be removed
k0ntext cleanup --dry-run

# Keep specific folders
k0ntext cleanup --keep .github,.vscode

# Verbose output
k0ntext cleanup -v
```

**Options:**
- `--dry-run` - Show what would be removed
- `--keep <folders>` - Folders to keep (comma-separated)
- `--ai` - Use AI to intelligently analyze which folders can be safely removed (new in v3.1.0)
- `-v, --verbose` - Show detailed output

#### `k0ntext validate`
Validate context files and AI tool configurations.

```bash
# Basic validation
k0ntext validate

# Auto-fix errors
k0ntext validate --fix

# Treat warnings as errors
k0ntext validate --strict
```

**Options:**
- `--fix` - Automatically fix validation errors
- `--strict` - Treat warnings as errors

#### `k0ntext export <output>`
Export context database to file.

```bash
# Export as JSON
k0ntext export context.json

# Export as markdown
k0ntext export docs.md --format markdown

# Export specific type
k0ntext export workflows.json --type workflow
```

**Options:**
- `--format <format>` - Export format (json, markdown)
- `--type <type>` - Filter by context type

#### `k0ntext import <input>`
Import context data from exported files.

```bash
# Import JSON export
k0ntext import context.json

# Import and merge with existing data
k0ntext import context.json --merge
```

**Options:**
- `--format <format>` - Import format (json, markdown)
- `--merge` - Merge with existing data (default: replace)

#### `k0ntext performance`
Show performance metrics and optimization suggestions.

```bash
# Human-readable report
k0ntext performance

# JSON output
k0ntext performance --json
```

**Options:**
- `--json` - Output as JSON

#### `k0ntext watch`
Watch for file changes and auto-update index.

```bash
# Start watching with 1s delay
k0ntext watch

# Custom debounce delay
k0ntext watch -d 2000
```

**Options:**
- `-d, --delay <ms>` - Debounce delay in milliseconds

#### `k0ntext index`
Index codebase content into the database.

```bash
# Index everything
k0ntext index

# Index documentation only
k0ntext index --docs

# Index source code only
k0ntext index --code

# Index AI tool configs only
k0ntext index --tools

# Verbose output
k0ntext index -v
```

**Options:**
- `--docs` - Index documentation files only
- `--code` - Index source code only
- `--tools` - Index AI tool configurations only
- `--all` - Index everything (default)
- `-v, --verbose` - Show detailed output

#### `k0ntext search <query>`
Search across indexed content.

```bash
# Basic search
k0ntext search "authentication"

# Search specific type
k0ntext search "user login" -t workflow

# Text-only search
k0ntext search "API endpoint" -m text

# Semantic search (requires OPENROUTER_API_KEY)
k0ntext search "data persistence" -m semantic

# Limit results
k0ntext search "database" -l 5
```

**Options:**
- `-t, --type <type>` - Filter by type
- `-l, --limit <n>` - Maximum results (default: 10)
- `-m, --mode <mode>` - Search mode: text, semantic, hybrid

#### `k0ntext stats`
Show database and indexing statistics.

```bash
# View all statistics
k0ntext stats

# Show specific stats (filtered by index)
k0ntext stats | grep "Context Items"
```

### v3.1.0 New Commands

#### `k0ntext check` (v3.4.0)
Check if context files are outdated.

```bash
# Check all context files
k0ntext check

# Check with detailed output
k0ntext check -v

# Prompt to update outdated files
k0ntext check --update

# Force update without prompts
k0ntext check --update --force
```

**Options:**
- `--update` - Prompt to update outdated files
- `--force` - Update without prompting
- `-v, --verbose` - Show detailed output

#### `k0ntext restore` (v3.4.0)
Restore AI tool config files from backups.

```bash
# List available backups
k0ntext restore --list

# Interactive restore mode
k0ntext restore

# Restore from specific backup
k0ntext restore --backup "AI_CONTEXT.md.2026-02-09T14.30.45.123Z.bak"

# Restore for specific tool
k0ntext restore --tool claude --list

# Force restore without confirmation
k0ntext restore --backup <path> --force
```

**Options:**
- `--list` - List available backups
- `--backup <path>` - Restore from specific backup path
- `--tool <name>` - Filter by tool name
- `--force` - Restore without confirmation

#### `k0ntext sync-templates` (v3.5.0)
Sync `.claude/` templates from package `templates/base/`.

```bash
# Sync all templates
k0ntext sync-templates

# Dry run to see what would change
k0ntext sync-templates --dry-run

# Sync specific subdirectories
k0ntext sync-templates --subdirs commands,agents

# Force overwrite all conflicts
k0ntext sync-templates --force

# Verbose output with diffs
k0ntext sync-templates --verbose

# Skip archiving removed files
k0ntext sync-templates --no-archive
```

**Options:**
- `--dry-run` - Show changes without applying
- `--force` - Auto-overwrite conflicts without prompting
- `--subdirs <dirs>` - Comma-separated subdirectories to sync (commands,agents,schemas,standards,tools,automation)
- `-v, --verbose` - Show detailed output including diffs
- `--no-archive` - Skip archiving removed files

#### `k0ntext template-status` (v3.5.0)
Show template sync status.

```bash
# Check sync status
k0ntext template-status

# Detailed status with file listings
k0ntext template-status --verbose
```

**Options:**
- `-v, --verbose` - Show detailed status with file listings

### v3.1.0 New Commands (Legacy)

#### `k0ntext drift-detect`
AI-powered documentation drift detection using semantic analysis.

```bash
# Detect drift in all context files
k0ntext drift-detect

# Detect drift in specific paths
k0ntext drift-detect -p CLAUDE.md,.cursorrules

# Check up to 20 files
k0ntext drift-detect --max-files 20

# Strict mode (fails on any drift)
k0ntext drift-detect --strict

# Verbose output
k0ntext drift-detect -v
```

**Options:**
- `--fix` - Automatically fix detected drift (experimental)
- `--strict` - Fail on any drift detected
- `-p, --paths <paths>` - Comma-separated paths to check
- `--max-files <number>` - Maximum files to check (default: 50)
- `--model <model>` - Override model (not recommended)
- `-v, --verbose` - Show detailed output

#### `k0ntext cross-sync`
Intelligently synchronize context across all AI tools after drift detection.

```bash
# Sync all affected files
k0ntext cross-sync

# Dry run to see what would be synced
k0ntext cross-sync --dry-run

# Sync to specific tools only
k0ntext cross-sync --to claude,cursor

# Sync from specific files
k0ntext cross-sync --affected CLAUDE.md,.cursorrules

# Verbose output with details
k0ntext cross-sync -v
```

**Options:**
- `--dry-run` - Show what would be synced without making changes
- `--from <tool>` - Sync only from specific tool
- `--to <tools>` - Sync only to specific tools (comma-separated)
- `--affected <files>` - Comma-separated list of affected files
- `-v, --verbose` - Show detailed sync output

#### `k0ntext hooks`
Manage git hooks for automatic context synchronization.

```bash
# Install git hooks
k0ntext hooks install

# Install with force (overwrite existing)
k0ntext hooks install -f

# Uninstall git hooks
k0ntext hooks uninstall

# Check hooks status
k0ntext hooks status
```

**Subcommands:**
- `install` - Install pre-commit hook for automatic workflow
- `uninstall` - Remove installed hooks
- `status` - Show hook installation status

**Install Options:**
- `-f, --force` - Overwrite existing hooks
- `--skip-backup` - Skip backing up existing hooks

#### `k0ntext fact-check [files...]`
Validate documentation accuracy using AI analysis.

```bash
# Check all documentation files
k0ntext fact-check

# Check specific files
k0ntext fact-check CLAUDE.md .cursorrules

# Set minimum confidence threshold
k0ntext fact-check --min-confidence 0.7

# Verbose output
k0ntext fact-check -v
```

**Options:**
- `--fix` - Automatically fix detected issues (experimental)
- `-v, --verbose` - Show detailed output
- `--min-confidence <number>` - Minimum confidence to report (0-1, default: 0.5)

### Git Hooks Workflow (v3.1.0)

When you install hooks with `k0ntext hooks install`, the pre-commit hook automatically:

1. **Autosync** - Sync context from source of truth
2. **Validate** - Check for context errors
3. **Drift Detect** - AI-powered drift detection
4. **Cross-Sync** - Update all AI tool contexts if drift found
5. **Auto-Add** - Include updated context files in commit

**Skip hooks temporarily:**
```bash
K0NTEXT_SKIP_HOOKS=1 git commit -m "message"
# or
git commit --no-verify -m "message"
```

## 🤖 MCP Server Usage

### Auto-Configuration (v3.1.1)

When you run `k0ntext init`, the MCP server is **automatically configured** in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "k0ntext": {
      "command": "npx",
      "args": ["k0ntext", "mcp"],
      "env": {
        "K0NTEXT_PROJECT_ROOT": "${projectFolder}"
      }
    }
  }
}
```

**Manual setup is no longer required!** The MCP server works immediately after initialization.

### Start the Server
```bash
# Start MCP server (auto-configured)
k0ntext mcp
```

### Available MCP Tools

1. **search_context** - Semantic search across all indexed content
2. **get_item** - Get a specific context item by ID or path
3. **add_knowledge** - Store new insights or facts
4. **analyze** - Run intelligent analysis on codebase
5. **get_tool_configs** - Get AI tool configurations
6. **query_graph** - Traverse knowledge graph
7. **get_stats** - Get database statistics

### Available Prompts

1. **context-engineer** - Initialize and configure AI context system
2. **core-architect** - Design system architecture
3. **api-developer** - Develop API endpoints
4. **database-ops** - Database operations
5. **integration-hub** - External integrations
6. **deployment-ops** - CI/CD and deployment

### Example MCP Tool Usage

```javascript
// Search for authentication workflows
const results = await search_context({
  query: "user authentication flow",
  type: "workflow",
  limit: 5
});

// Get a specific item
const item = await get_item({
  id: "workflow:user-auth"
});

// Add new knowledge
await add_knowledge({
  name: "API Rate Limiting",
  content: "Our API uses token bucket algorithm with 1000 req/min",
  relatedTo: ["api:main-endpoint"]
});
```

## 🎨 Supported AI Tools

### Fully Supported
- **Claude** - AI_CONTEXT.md
- **GitHub Copilot** - .github/copilot-instructions.md
- **Cursor** - .cursorrules
- **Windsurf** - .windsurf/rules.md
- **Cline** - .clinerules
- **Aider** - .aider.conf.yml
- **Continue** - .continue/config.json
- **Antigravity** - .agent/README.md
- **Gemini** - .gemini/config.md

### RPI Workflow Skills
- **@context-engineer** - Setup and configuration
- **@core-architect** - System design
- **@api-developer** - API development
- **@database-ops** - Database operations
- **@integration-hub** - External integrations
- **@deployment-ops** - CI/CD and deployment

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | API key for intelligent analysis via OpenRouter | For `--intelligent` flag |
| `K0NTEXT_PROJECT_ROOT` | Override project root path | Optional |
| `K0NTEXT_DB_PATH` | Override database file path | Optional |

### Database Location

By default, k0ntext stores its SQLite database at `.k0ntext.db` in the project root. This file is automatically added to `.gitignore`.

### Tool Configuration Paths

Each AI tool has its own configuration file path:
- Claude: `AI_CONTEXT.md`
- Copilot: `.github/copilot-instructions.md`
- Cursor: `.cursorrules`
- Windsurf: `.windsurf/rules.md`
- Cline: `.clinerules`
- Aider: `.aider.conf.yml`
- Continue: `.continue/config.json`
- Antigravity: `.agent/README.md`
- Gemini: `.gemini/config.md`

## 🏗️ Architecture

### System Components

```
k0ntext/
├── src/                    # TypeScript source
│   ├── cli/                # CLI commands (20 commands)
│   │   ├── version/        # Version detection system (v3.4.0)
│   │   ├── commands/       # Command implementations
│   │   └── utils/          # File detector, backup manager (v3.4.0)
│   ├── config/             # Centralized configuration (v3.1.0)
│   ├── db/                 # SQLite database client
│   ├── analyzer/           # Intelligent codebase analysis
│   ├── embeddings/         # OpenRouter integration
│   ├── agents/             # Smart agents (Cleanup, Performance, Drift, FactCheck)
│   ├── template-engine/    # Handlebars template system (v3.4.0)
│   └── mcp.ts              # MCP server implementation
├── agents/                 # Agent definitions
├── skills/                 # RPI workflow skills
├── templates/              # Output templates
└── .k0ntext.db             # SQLite database (auto-created)
```

### Data Flow

1. **Initialization** - `k0ntext init` discovers and analyzes codebase
2. **Indexing** - `k0ntext index` stores content in SQLite with embeddings
3. **Generation** - `k0ntext generate` creates tool-specific context files
4. **Sync** - `k0ntext sync` keeps all AI tools synchronized
5. **MCP Server** - `k0ntext mcp` provides real-time context to AI assistants

### Database Schema

The SQLite database contains:
- **Context Items** - Workflows, agents, commands, code, docs
- **Embeddings** - Vector embeddings for semantic search
- **Relations** - Knowledge graph connections
- **Sync State** - Change tracking for synchronization (with version tracking in v3.4.0)
- **Tool Configs** - AI tool configurations
- **Generated Files** - File tracking with hashes and backups (v3.4.0)

## 🚀 Development

### Build and Test

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests once (no watch)
npm run test:run

# Lint code
npm run lint
```

### Publishing

```bash
# Dry run
npm run publish:dry

# Publish to npm
npm run publish:public
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Project Structure

- `src/cli/` - Command implementations
- `src/db/` - Database operations
- `src/analyzer/` - Code analysis logic
- `src/agents/` - Smart agents
- `templates/` - Context templates
- `.claude/` - Claude Code development context

## 📊 Performance Monitoring

The PerformanceMonitorAgent provides insights into:
- Query execution times
- Database size and growth
- Slow query detection
- Optimization suggestions

```bash
# View performance report
k0ntext performance

# Get JSON metrics
k0ntext performance --json
```

Common optimization suggestions:
- Add indexes for frequently queried columns
- Run VACUUM for large databases
- Review and optimize slow queries
- Monitor cache hit rates

## 🔍 Troubleshooting

### Common Issues

1. **SQLite Native Extension Issues (Windows)**
   ```bash
   # Use Node.js LTS version
   node --version
   ```

2. **OpenRouter API Key Not Found**
   ```bash
   # Set the environment variable
   export OPENROUTER_API_KEY=your_api_key_here
   ```

3. **Database Locked**
   ```bash
   # Close other instances of k0ntext
   # Or wait a few seconds
   ```

4. **Permission Errors**
   ```bash
   # Check file permissions
   ls -la .k0ntext.db
   ```

### Debug Mode

```bash
# Verbose output for most commands
k0ntext init -v
k0ntext index -v
k0ntext generate -v
```

## 🤝 Community

- **GitHub Issues:** [Report bugs and request features](https://github.com/SireJeff/k0ntext/issues)
- **Discussions:** [Join community discussions](https://github.com/SireJeff/k0ntext/discussions)
- **Documentation:** [Full API documentation](./docs/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Repository:** https://github.com/SireJeff/k0ntext
**npm Package:** https://www.npmjs.com/package/k0ntext
**Issues:** https://github.com/SireJeff/k0ntext/issues
**MCP Protocol:** https://modelcontextprotocol.io

Made with ❤️ by [SireJeff](https://github.com/SireJeff)