# Changelog

All notable changes to the `k0ntext` package will be documented in this file.

## [3.2.1] - 2026-02-08

### 🐛 Bug Fixes

#### Fixed: `--max-files` option not working
- **Commander.js option parsing bug**: The `--max-files` option was defined with kebab-case but accessed incorrectly
- **Root cause**: Commander.js converts option names to camelCase (`maxFiles`), but code was checking for kebab-case (`max-files`)
- **Fix**: Updated `BatchIndexOptions` interface to use camelCase property names
- **Impact**: `npx k0ntext index:batch --max-files 4000` now correctly indexes up to 4000 files per module

### Changed
- **`src/cli/commands/batch-index.ts`**: Added `BatchIndexOptions` interface with proper camelCase types
- **`src/cli/commands/batch-index.ts`**: Updated option access to use `options.maxFiles` instead of `options['max-files']`

### Usage
```bash
# Now works correctly
npx k0ntext index:batch --max-files 4000
npx k0ntext index:batch -m 2000  # Short form also works
```

---

## [3.2.0] - 2026-02-08

### 🚀 Monorepo Batch Indexing

### Added

#### New Command: `index:batch`
- **Monorepo-aware indexing** - Automatically detects and processes monorepo modules
- **Module auto-detection** - Finds backend/, frontend/, core/, packages/, services/, apps/, docs/, devops/
- **Submodule discovery** - Recursively discovers submodules within each module
- **Per-module limits** - Configurable `--max-files` per module (default: 500)
- **Batch processing** - Splits large modules into batches (default: 100 files per batch)
- **Progress tracking** - Shows detailed progress for each module with file counts
- **Skip embeddings** - `--skip-embeddings` flag for faster indexing

#### New File
- **`src/cli/commands/batch-index.ts`** - Batch indexing implementation with monorepo detection

### Changed
- **`src/cli/index.ts`** - Added `index:batch` command registration

### Usage

```bash
# Basic monorepo indexing
npx k0ntext index:batch

# Increase limits for very large modules
npx k0ntext index:batch --max-files 1000

# Skip embeddings for faster indexing
npx k0ntext index:batch --skip-embeddings

# Verbose output
npx k0ntext index:batch -v
```

### Example Output
```
Detected Modules:
• root                    (953 files) - Root configuration and documentation
• backend                 (475 files) - backend module
• frontend                (396 files) - frontend module
• core                    (66 files) - core module
• frontend/DLKFTD-1       (267 files) - DLKFTD-1 submodule
• frontend/DLKFTD-2       (129 files) - DLKFTD-2 submodule

Batch Index Summary:
• Modules Processed:  6
• Documentation Files: 472
• Code Files:         1564
• Config Files:       463
• Total Indexed:      2499 files
```

---

## [3.1.1] - 2026-02-08

### 🚀 MCP Auto-Configuration & CLI Documentation Integration

### Added

#### MCP Server Auto-Configuration
- **`k0ntext init`** - Now automatically configures MCP server in `.claude/settings.json`
- **`src/cli/index.ts`** - Added `configureMcpServer()` function for automatic setup
- **`templates/base/settings.json`** - Updated with k0ntext MCP server configuration
- **No more manual setup** - MCP server works immediately after initialization
- Support for Claude Code, Cursor, and Continue (tools with native MCP support)

#### CLI Documentation in Templates
- **All 6 agent templates** now include k0ntext CLI command documentation:
  - `context-engineer.md` - init, generate, validate, index, stats
  - `core-architect.md` - init, generate, drift-detect, cross-sync, search
  - `database-ops.md` - index, search, stats, validate
  - `api-developer.md` - generate, drift-detect, fact-check
  - `integration-hub.md` - sync, cross-sync, validate
  - `deployment-ops.md` - hooks, validate, export, import

- **All 12 command templates** now include k0ntext CLI command documentation:
  - `help.md` - Comprehensive reference to all 17 commands
  - `context-optimize.md` - stats, performance, validate
  - `verify-docs-current.md` - drift-detect, fact-check, search
  - `validate-all.md` - validate, stats, fact-check
  - `rpi-research.md` - index, search, stats
  - `rpi-plan.md` - search, drift-detect
  - `rpi-implement.md` - watch, validate, fact-check
  - `auto-sync.md` - sync, cross-sync, hooks
  - `session-save.md` - export, stats
  - `session-resume.md` - import, search
  - `analytics.md` - stats, performance, export
  - `collab.md` - sync, cross-sync, export, import

#### Comprehensive CLI Reference
- **`templates/base/CLI_COMMANDS.md`** - New comprehensive reference document
- All 17 k0ntext CLI commands documented with:
  - Command syntax and options
  - When to use each command
  - Practical examples
  - Command categories (Setup, Sync, Validation, Database, Utility)
  - Common workflows
  - Integration with AI tools

### Changed
- **`README.md`** - Updated with MCP auto-configuration feature
- **`README.md`** - Enhanced MCP Server Usage section with auto-configuration notes
- Agent and command templates now provide actionable CLI guidance

### New Files Created (20)
1. `src/cli/index.ts` - Added `configureMcpServer()` function
2. `templates/base/settings.json` - Updated with MCP configuration
3. `templates/base/CLI_COMMANDS.md` - New comprehensive CLI reference
4-9. Updated 6 agent templates with CLI documentation
10-21. Updated 12 command templates with CLI documentation

### Documentation Coverage Matrix

| CLI Command | Agent Templates | Command Templates | CLI Reference |
|-------------|----------------|-------------------|---------------|
| init | ✅ context-engineer | ✅ help | ✅ CLI_COMMANDS.md |
| generate | ✅ context-engineer, core-architect | ✅ help | ✅ CLI_COMMANDS.md |
| mcp | ✅ context-engineer | ✅ help | ✅ CLI_COMMANDS.md |
| sync | ✅ integration-hub | ✅ auto-sync, help | ✅ CLI_COMMANDS.md |
| cleanup | ✅ deployment-ops | ✅ help | ✅ CLI_COMMANDS.md |
| validate | ✅ all agents | ✅ validate-all, help | ✅ CLI_COMMANDS.md |
| export | ✅ deployment-ops | ✅ session-save, analytics, help | ✅ CLI_COMMANDS.md |
| import | ✅ deployment-ops | ✅ session-resume, help | ✅ CLI_COMMANDS.md |
| performance | ✅ context-engineer | ✅ analytics, help | ✅ CLI_COMMANDS.md |
| watch | ✅ rpi-implement | ✅ help | ✅ CLI_COMMANDS.md |
| drift-detect | ✅ core-architect, api-developer | ✅ rpi-plan, verify-docs-current, help | ✅ CLI_COMMANDS.md |
| cross-sync | ✅ core-architect, integration-hub | ✅ auto-sync, help | ✅ CLI_COMMANDS.md |
| hooks | ✅ deployment-ops | ✅ auto-sync, help | ✅ CLI_COMMANDS.md |
| fact-check | ✅ api-developer | ✅ verify-docs-current, validate-all, help | ✅ CLI_COMMANDS.md |
| index | ✅ database-ops, context-engineer | ✅ rpi-research, help | ✅ CLI_COMMANDS.md |
| search | ✅ core-architect, database-ops | ✅ rpi-research, rpi-plan, help | ✅ CLI_COMMANDS.md |
| stats | ✅ context-engineer, database-ops | ✅ analytics, context-optimize, help | ✅ CLI_COMMANDS.md |

### Breaking Changes
- None - fully backward compatible with v3.1.0

### Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| MCP auto-config | Manual | Automatic | ✅ Complete |
| CLI commands in templates | 0 | 17+ references | ✅ Complete |
| Agent templates with CLI docs | 0/6 | 6/6 | ✅ 100% |
| Command templates with CLI docs | 0/12 | 12/12 | ✅ 100% |
| CLI reference document | None | CLI_COMMANDS.md | ✅ Created |

---

## [3.1.0] - 2026-02-07

### 🎉 Intelligence-First Context Engineering

### Added

#### Centralized Model Configuration
- **`src/config/models.ts`** - Single source of truth for all AI model usage
- Strict enforcement of `google/gemini-3-flash-preview` for all intelligent operations
- Type-safe model configuration with `as const` assertions
- Environment variable override support for flexibility
- Models: DRIFT_DETECTION, WORKFLOW_DISCOVERY, SMART_MERGE, CLEANUP, FACT_CHECK, EMBEDDING

#### AI-Powered Drift Detection
- **`k0ntext drift-detect`** - New command for semantic drift detection
- **`src/agents/drift-agent.ts`** - AI-powered drift detection agent
- Replaces hash-based drift checks with intelligent semantic analysis
- Severity-based reporting (high/medium/low)
- Automatic fix suggestions for detected drift
- Configurable file limits and confidence thresholds

#### Intelligent Cross-Sync
- **`k0ntext cross-sync`** - New command for intelligent tool synchronization
- AI analysis of which files are affected by recent changes
- Targeted updates to only the necessary tool context files
- Dry-run mode for previewing changes
- Detailed sync operation logging

#### Git Hooks Automation
- **`k0ntext hooks`** - New command group for git hooks management
- Subcommands: `install`, `uninstall`, `status`
- Full pre-commit workflow:
  1. Autosync from source of truth
  2. Validate context files
  3. AI-powered drift detection
  4. Cross-sync affected files
  5. Auto-add updated context files to commit
- Skip mechanism via `K0NTEXT_SKIP_HOOKS` environment variable

#### Fact-Checking Agent
- **`k0ntext fact-check`** - New command for documentation validation
- **`src/agents/fact-check-agent.ts`** - Fact-checking agent
- Identifies outdated APIs, wrong file paths, missing dependencies
- Confidence scoring for each claim (0-1)
- Minimum confidence threshold filtering

#### Map-Based Context Templates
- **`k0ntext generate --map`** - New flag for concise map-based format
- **`templates/map/`** - New directory with map-based templates
- Reduces hallucination through precise references
- Structured tables for workflows, architecture, commands
- Alternative to verbose documentation format

#### Enhanced Cleanup Command
- **`k0ntext cleanup --ai`** - New AI analysis mode
- Intelligent recommendations for which folders to keep/remove
- OpenRouter-powered analysis of project structure

### Changed
- **`src/embeddings/openrouter.ts`** - Now uses centralized model configuration
- **`src/cli/generate.ts`** - Added map-based template generation with `--map` flag
- **`src/cli/commands/cleanup.ts`** - Enhanced with AI analysis mode
- **`.claude/automation/hooks/pre-commit.sh`** - Complete rewrite with 5-step workflow
- Package version: `3.0.0` → `3.1.0`

### New CLI Commands (5 total)
1. `k0ntext drift-detect` - AI-powered drift detection
2. `k0ntext cross-sync` - Intelligent cross-tool sync
3. `k0ntext hooks install` - Install git hooks
4. `k0ntext hooks status` - Check hooks installation
5. `k0ntext fact-check` - Validate documentation accuracy

### New Files Created (15)
1. `src/config/models.ts`
2. `src/agents/drift-agent.ts`
3. `src/agents/fact-check-agent.ts`
4. `src/cli/commands/drift-detect.ts`
5. `src/cli/commands/cross-sync.ts`
6. `src/cli/commands/hooks.ts`
7. `src/cli/commands/fact-check.ts`
8. `templates/map/claude.md`
9. `templates/map/copilot.md`
10. `templates/map/cline.md`
11. `templates/map/cursor.md`
12. `templates/map/gemini.md`
13. Updated `.claude/automation/hooks/pre-commit.sh`
14. Updated `README.md` with v3.1.0 features
15. Updated `CHANGELOG.md` with v3.1.0 entry

### Model Enforcement
All AI operations now use centralized configuration:
- Drift Detection → `google/gemini-3-flash-preview`
- Workflow Discovery → `google/gemini-3-flash-preview`
- Smart Merge → `google/gemini-3-flash-preview`
- Cleanup → `google/gemini-3-flash-preview`
- Fact Check → `google/gemini-3-flash-preview`
- Embeddings → `openai/text-embedding-3-small`

### Breaking Changes
- None - fully backward compatible with v3.0.0

### Documentation Updates
- README.md - Added v3.1.0 command documentation
- README.md - Added git hooks workflow section
- README.md - Updated feature overview with new capabilities
- README.md - Updated CLI command count from 13 to 18

---

## [3.0.0] - 2026-02-05

### 🎉 Major Release - Unified AI Context Package

### Breaking Changes

- **Package consolidation**: `create-universal-ai-context`, `@ai-context/mcp-server`, and `claude-context-plugin` are now consolidated into the unified `k0ntext` package
- **New primary package**: `k0ntext` (v3.0.0) is now the main package
- **Legacy deprecation**: Previous packages marked as deprecated (see [Migration Guide](./docs/MIGRATE_TO_UNIFIED.md))

### Added

#### Unified Package Features
- **Intelligent Analysis**: OpenRouter-powered codebase analysis with 595-line intelligent analyzer
- **MCP Server**: Complete Model Context Protocol server with 10 tools and 6 prompts
- **Database Storage**: SQLite + sqlite-vec for vector embeddings and semantic search
- **Cross-Tool Sync**: Support for 9 AI tools (Claude, Copilot, Cline, Antigravity, Windsurf, Aider, Continue, Cursor, Gemini)
- **CLI Commands**: 7 primary commands (init, index, search, stats, mcp, generate, sync)

#### RPI Workflow v2.0
- **Parallel Agents**: 3-5 simultaneous research agents with chunk-based processing
- **Chunk-Based Todolists**: Structured output for sequential phase processing
- **Inter-Phase Communication**: Explicit contracts between research, plan, and implement phases
- **Context Optimization**: `/context-optimize` command for workflow orchestration

#### Documentation
- **Comprehensive Guides**: README, troubleshooting, quick start, migration guide
- **MCP Documentation**: Complete MCP server configuration and usage
- **61 Error Codes**: Detailed troubleshooting with specific solutions

### Fixed

- **Post-commit hook revision loop**: Added `sync:state` command to prevent infinite loops
- **Aider config defaults**: Improved template with better defaults
- **Context Engineer v2.0**: Enhanced with cross-tool sync support

### Deprecated

- `create-universal-ai-context` (v2.5.0) - Security updates only until 2026-06-01
- `@ai-context/mcp-server` (v1.0.0) - Functionality included in `k0ntext`
- `claude-context-plugin` (v2.1.4) - Use `k0ntext` skills instead

### Migration

See [Migration Guide](./docs/MIGRATE_TO_UNIFIED.md) for detailed instructions.

---

## [2.5.0] - 2026-02-04

### Added
- **MCP Server** - Database-backed context via SQLite + vector search
  - New package: `@ai-context/mcp-server`
  - CLI commands: `mcp:init`, `mcp:status`, `mcp:start`, `mcp:watch`, `mcp:migrate`, `mcp:export`, `mcp:sync`
  - Cross-tool export from the MCP database to all AI tool formats
- **RPI Workflow Enhancements**
  - Parallel agent research with chunked outputs
  - Chunk-based planning and implementation todolists
- **/context-optimize Command** - Orchestrated context optimization with interactive scoping

### Documentation
- Added MCP server docs and troubleshooting guidance
- Updated quick start and migration guides for new AI tool outputs

---

## [2.4.0] - 2026-01-31

### Added
- **New AI Tool Adapters** - Windsurf IDE, Aider, Continue
  - Windsurf: Generates `.windsurf/rules.md` with XML-tagged sections
  - Aider: Generates `.aider.conf.yml` configuration
  - Continue: Generates `.continue/config.json` configuration

### Improved
- **Error Handling** - Added fs-wrapper for non-fatal filesystem errors
  - WARNING-level handling for permission issues
  - EEXIST handling for existing directories
- **Placeholder Validation** - New `--fail-on-unreplaced` CLI flag
  - Tracks unreplaced placeholders with file locations
  - Throws error if placeholders remain and flag is set

### Test Coverage
- 591 tests passing (up from 506)
- All new adapters have full unit test coverage

---

## [2.3.0] - 2026-01-30

### Added - Symlink Architecture for `.claude/`

#### New Feature: `.claude/` as Symlinks to `.ai-context/`
- **Single source of truth** - All content lives in `.ai-context/`
- **Automatic synchronization** - Changes in `.ai-context/` immediately visible in `.claude/`
- **No content duplication** - Symlinks replace copied directories

#### How It Works
```
.claude/
├── agents       → ../.ai-context/agents/   (symlink)
├── commands     → ../.ai-context/commands/ (symlink)
├── indexes      → ../.ai-context/indexes/  (symlink)
├── context      → ../.ai-context/context/  (symlink)
├── schemas      → ../.ai-context/schemas/  (symlink)
├── standards    → ../.ai-context/standards/ (symlink)
├── tools        → ../.ai-context/tools/    (symlink)
├── settings.json (real file - Claude-specific)
└── README.md    (real file - documents the symlinks)
```

#### Benefits
- **Zero duplication** - Content no longer copied between directories
- **Automatic sync** - Edit in `.ai-context/`, immediately reflected in `.claude/`
- **Backward compatible** - Claude Code still auto-discovers from `.claude/`
- **Fallback support** - On systems where symlinks fail (Windows permissions), falls back to copying
- **Cleaner architecture** - Clear separation: universal content (`.ai-context/`) vs tool-specific config (`.claude/`)

#### Implementation Details
- Modified `lib/adapters/claude.js` to create symlinks instead of copying directories
- Added Windows-specific symlink handling with junction symlinks
- Graceful fallback to copy when symlinks aren't supported
- Enhanced test cleanup to handle symlink deletion on Windows

#### Migration Notes
- Existing `.claude/` directories will NOT be overwritten (preserved for safety)
- To upgrade: Delete old `.claude/` and rerun `npx create-universal-ai-context`
- Or manually: Replace subdirectories with symlinks to `../.ai-context/`

### Changed
- Updated `lib/adapters/claude.js` - Symlink generation instead of directory copying
- Updated `.claude/README.md` - Documents symlink architecture
- Updated success logic to handle info messages for symlinks

### Test Coverage
- Updated unit tests for symlink behavior
- Enhanced E2E test cleanup for Windows symlink issues
- Updated integration test cleanup to handle `.claude/`
- **453 tests passing** (all unit, integration, and E2E tests)

---

## [2.2.2] - 2026-01-29

### Fixed
- **status command** - Fixed false "Mixed v1.x and v2.0 installation" detection
  - In v2.0, both `.ai-context/` AND `.claude/` can exist (Claude adapter creates both)
  - Now checks for `AI_CONTEXT.md` as the v2.0 indicator
- **sync:all command** - Fixed crash when syncing from codebase
  - Changed `analyzeProject()` to `analyzeCodebase()` (correct function name)

---

## [2.2.1] - 2026-01-29

### Fixed
- **hooks:install command** - Fixed missing hook templates in npm package
  - Moved hook templates to `packages/create-ai-context/templates/hooks/`
  - Created proper install module in `lib/install-hooks.js`
  - Updated CLI to use new install script
  - Hooks are now properly included in published package

---

## [2.2.0] - 2026-01-29

### Added - Cross-Tool Context Synchronization

#### New Feature: Automatic Sync Between AI Tools
- **Cross-tool synchronization** - Automatically keep AI tool contexts in sync
  - When one tool's context changes, automatically propagate to others
  - File-based change detection using SHA-256 hashing
  - Four conflict resolution strategies: source_wins, regenerate_all, newest, manual

#### New Sync Module (`lib/cross-tool-sync/`)
- **sync-manager.js** - Core synchronization logic
  - Change detection via file hashing
  - Sync state persistence (`.ai-context/sync-state.json`)
  - Sync history tracking
- **file-watcher.js** - File change monitoring
  - Pure Node.js implementation (no external dependencies)
  - Polling-based change detection (configurable)
  - Directory hashing for multi-file contexts
- **sync-service.js** - Background service for continuous monitoring
  - Debounced sync to avoid excessive regenerations
  - Configurable strategies and intervals

#### New CLI Commands
- `sync:check` - Check if contexts are synchronized
- `sync:all` - Sync all tools from codebase
- `sync:from <tool>` - Propagate from specific tool to others
- `sync:resolve` - Resolve conflicts between tools
- `sync:history` - View sync history
- `hooks:install` - Install git hooks for automatic sync

#### Git Hooks Integration
- **pre-commit hook** - Checks sync status before commits
  - Blocks commit if contexts are out of sync
  - Shows which tools need syncing
- **post-commit hook** - Triggers background sync after commits
- **Installation:** `npx create-ai-context hooks:install`

#### Test Coverage
- 19 new unit tests for cross-tool sync functionality
- Total: 420+ unit tests passing

### Changed
- Enhanced `CLAUDE.md` with cross-tool sync commands and architecture
- Updated system architecture to include sync service layer

### Documentation
- `.claude/context/CROSS_TOOL_SYNC.md` - Complete feature documentation
- `.claude/automation/hooks/README.md` - Git hooks usage guide

---

## [2.1.0] - 2026-01-29

### Added

#### Documentation Discovery
- **`lib/doc-discovery.js`** - Scans for existing AI context files before initialization
  - Detects Claude v1 (`.claude/`, `CLAUDE.md`) and v2 (`.ai-context/`, `AI_CONTEXT.md`)
  - Detects GitHub Copilot (`.github/copilot-instructions.md`)
  - Detects Cline (`.clinerules`)
  - Detects Antigravity (`.agent/`)
  - Finds common docs (README.md, ARCHITECTURE.md, CHANGELOG.md, docs/)
  - Extracts values from existing documentation
  - Generates merge recommendations and detects conflicts

#### Drift Detection
- **`lib/drift-checker.js`** - Validates documentation references against codebase
  - File path validation (`src/auth.js`)
  - Line number validation (`file.js:123`)
  - Anchor/symbol validation (`file.py::function_name()`)
  - Directory reference validation (`src/components/`)
  - Markdown link validation (`[text](./path.md)`)
  - Health score calculation (0-100%)
  - Status levels: HEALTHY, NEEDS_UPDATE, STALE, CRITICAL

#### Smart Merge
- **`lib/smart-merge.js`** - Intelligently merges existing docs with new analysis
  - Preserves user customizations
  - Updates stale/default values
  - Preserves custom sections not in template
  - Updates or removes stale line references
  - Generates diff reports and migration notes

#### New CLI Features
- **`drift` subcommand** - Standalone drift checking
  - `npx create-universal-ai-context drift --all` - Check all docs
  - `npx create-universal-ai-context drift --file README.md` - Check specific file
  - `--fix` flag for auto-fixing where possible
  - `--strict` flag for CI integration (exit 1 on issues)
  - `--output json|markdown|console` format options

- **Merge mode flags**
  - `--mode merge|fresh|overwrite` - Control how existing docs are handled
  - `--preserve-custom` - Keep user customizations (default: true)
  - `--update-refs` - Auto-fix drifted line numbers
  - `--backup` - Create backup before changes

#### Interactive Discovery Prompts
- Prompts user when existing documentation is detected
- Strategy options: Merge (recommended), Fresh, Overwrite, Skip
- Conflict resolution for values found in multiple sources

### Test Coverage
- 160 new unit tests for discovery, drift, and merge modules
- Total: 363 unit tests passing

---

## [2.0.0] - 2026-01-28

### Breaking Changes
- **Renamed `.claude/` to `.ai-context/`** - Universal AI tool support (not Claude-specific)
- **Renamed `CLAUDE.md` to `AI_CONTEXT.md`** - Universal entry point for all AI tools
- **New primary package `create-universal-ai-context`** - Replaces `create-claude-context` for new installs

### Added

#### Multi-AI Tool Support
- **Claude Code**: `AI_CONTEXT.md` + `.ai-context/` directory structure
- **GitHub Copilot**: `.github/copilot-instructions.md`
- **Cline**: `.clinerules`
- **Antigravity**: `.agent/` (10 files: identity, architecture, workflows, skills)

#### Automatic Codebase Analysis
- Entry point detection for 6 frameworks (Express, FastAPI, Next.js, Django, Rails, NestJS)
- Workflow discovery with heuristics (auth, payments, data processing, etc.)
- LOC counting with code/comments/blank breakdown
- File purpose classification (controller, model, service, middleware, etc.)
- Dependency extraction from package.json, requirements.txt, go.mod

#### Workflow Documentation Generation
- Auto-generates 5-15 workflow documentation files per project
- Real file:line references in generated docs
- Architecture diagram generation
- Code-to-workflow mapping

#### New CLI Features
- `npx create-universal-ai-context` - New universal command
- `--ai <tool>` flag - Select output format (claude, copilot, cline, antigravity, all)
- `--static` flag - Force static analysis only
- `--force-ai` flag - Require Claude Code session
- `--dry-run` flag - Preview without changes
- `generate` subcommand - Regenerate context files
- `migrate` subcommand - Upgrade v1.x to v2.0
- `status` subcommand - Check installation status

#### Environment Detection
- `full-ai` mode: Claude Code + API key
- `hybrid` mode: Claude Code without API
- `standalone` mode: No Claude Code (static analysis)

### Test Coverage
- 255 tests passing (unit + integration + E2E)
- E2E tests on Express and FastAPI fixtures
- Integration tests for all new modules

---

## [1.2.4] - 2026-01-28

### Added
- **New `claude-context` npm package** - CLI tools for ongoing management
  - `npx claude-context validate` - Validate setup (schema, links, placeholders, structure, lines)
  - `npx claude-context sync` - Check/fix documentation drift
  - `npx claude-context hooks` - Install/uninstall git hooks
  - `npx claude-context diagnose` - Run system diagnostics
  - `npx claude-context generate` - Regenerate code-map, indexes, anchors

---

## [1.2.2] - 2026-01-24

### Fixed
- Static analyzer now detects Jupyter notebook files (`.ipynb`) and Python Window scripts (`.pyw`) in Python projects
- Previously, Python projects containing only `.ipynb` files would show "0 files detected"

---

## [1.2.1] - 2026-01-24

### Added
- Entry point detection in `detector.js` for 6 frameworks (Express, FastAPI, Next.js, Django, Rails, NestJS)
- Analysis-aware placeholder replacement in `placeholder.js`
- CLI integration tests with Express app fixture
- 207 total tests (unit + integration)

### Changed
- `getDefaultValues()` now accepts analysis parameter for smarter defaults
- `CORE_FILES_LIST` populated from detected entry points
- `WORKFLOWS_COUNT` derived from actual workflow analysis

---

## [1.2.0] - 2026-01-24

### Added

#### Automatic Context Engineering Initialization
- **Environment Detection** - Detects Claude Code session vs standalone mode
  - `full-ai` mode: Claude Code + API key (AI-enhanced analysis)
  - `hybrid` mode: Claude Code without API (static + AI handoff)
  - `standalone` mode: No Claude Code (static analysis only)
- **Deep Codebase Analysis** - Automatic discovery of:
  - Entry points (API routes, CLI handlers, event listeners)
  - Workflows (authentication, payments, data processing patterns)
  - Architecture (directory structure, layers)
  - Dependencies (npm, pip, go modules)
- **Framework Detection** - Entry point patterns for Express, FastAPI, Next.js, Django, Rails, NestJS
- **Template Population** - Generates real documentation with file references
- **AI Orchestration** - Creates `INIT_REQUEST.md` for `@context-engineer` in hybrid mode
- **Call Chain Tracing** - Static analysis of function call hierarchies

#### New Modules (`packages/create-claude-context/lib/`)
- `environment-detector.js` - Detects execution environment and capabilities
- `static-analyzer.js` - Deep codebase analysis without AI
- `ai-orchestrator.js` - Coordinates with @context-engineer for AI analysis
- `template-populator.js` - Populates templates with analysis results
- `call-tracer.js` - Traces function call chains for workflow documentation

#### New CLI Options
- `--ai` - Force AI mode (requires Claude Code)
- `--static` - Force static-only analysis
- `--analyze-only` - Run analysis without installation

#### npm Packages (`packages/`)
- `create-claude-context` - CLI for one-command setup (`npx create-claude-context`)
- `claude-context-plugin` - Optional plugin with ongoing commands

#### Self-Sustaining Automation (`.claude/automation/`)
- `generators/code-mapper.js` - Auto-generates CODE_TO_WORKFLOW_MAP.md
- `generators/index-builder.js` - Rebuilds category indexes from content
- `hooks/pre-commit.sh` - Validates documentation before commits
- `hooks/post-commit.sh` - Rebuilds indexes after commits
- `config.json` - Automation configuration

#### Session Management (`.claude/session/`)
- `/session-save` command - Save session state with optional checkpoints
- `/session-resume` command - Resume previous sessions
- `current/state.json` - Active session tracking
- `history/` - Archived sessions by date
- `checkpoints/` - Named resume points

#### Drift Detection & Synchronization (`.claude/sync/`)
- `/auto-sync` command - Synchronize documentation with code
- `anchors.json` - Semantic anchors mapping (file::function() format)
- `hashes.json` - Content hashes for change detection
- `staleness.json` - Documentation freshness tracking
- Drift levels: NONE, LOW, MEDIUM, HIGH, CRITICAL

#### New JSON Schemas (`.claude/schemas/`)
- `automation.schema.json` - Automation config validation
- `session.schema.json` - Session state validation
- `anchors.schema.json` - Semantic anchors validation
- `hashes.schema.json` - File hashes validation
- `staleness.schema.json` - Staleness tracking validation
- `team-config.schema.json` - Team config validation
- `roles.schema.json` - Team roles validation

#### New Tools/Lib Modules
- `session-manager.js` - Session persistence and restoration
- `anchor-resolver.js` - Semantic anchor resolution (supports Python, JS, TS, Go, Rust, Ruby)
- `drift-detector.js` - Documentation drift detection

#### Unit Tests (`packages/create-claude-context/tests/`)
- 207 unit tests for all CLI modules
- Tests for environment detector, static analyzer, AI orchestrator
- Tests for template populator and call tracer
- Integration tests with Express app fixture
- Vitest test framework with coverage reporting
- Test fixtures for Python, Node.js, Go, and Express projects

#### Enhanced Detector (`lib/detector.js`)
- `ENTRY_POINT_PATTERNS` - Regex patterns for 6 frameworks
- `detectEntryPoints()` - Detects API routes from source files
- Supports Express, FastAPI, Next.js, Django, Rails, NestJS

#### Enhanced Placeholder (`lib/placeholder.js`)
- Analysis-aware `getDefaultValues()` function
- `CORE_FILES_LIST` populated from detected entry points
- `WORKFLOWS_COUNT` from actual workflow analysis
- 30+ new placeholder values for templates

#### New Tech Stack Presets (12 total)
- `python-django` - Python + Django + PostgreSQL
- `node-nestjs` - Node.js + NestJS + TypeORM
- `typescript-remix` - TypeScript + Remix + Prisma
- `java-spring` - Java + Spring Boot + PostgreSQL
- `csharp-dotnet` - C# + .NET Core + Entity Framework
- `php-laravel` - PHP + Laravel + MySQL

#### CI/CD Workflows (`.github/workflows/`)
- `ci.yml` - PR validation (lint, test, package integrity)
- `npm-publish.yml` - Automated npm publishing on release

#### Documentation Placeholders
- `FILE_OWNERSHIP.md` - Template for tracking file ownership
- `INTEGRATION_POINTS.md` - Template for documenting integrations
- `TESTING_MAP.md` - Template for test coverage mapping

### Changed
- `settings.json` now includes session, automation, hooks sections (v1.2.0)
- `tools/lib/index.js` exports new modules (sessionManager, anchorResolver, driftDetector)
- README completely rewritten with all 11 commands, 12 tech stacks, self-sustaining features
- Total commands increased from 8 to 11
- Total schemas increased from 7 to 14
- All templates synced with source files

### Fixed
- Schema references across all JSON config files
- Cross-references between documentation files
- Version consistency across all package.json files
- Template `settings.json` now uses official Claude Code schema (`https://json.schemastore.org/claude-code-settings.json`)

---

## [1.1.0] - 2025-01-24

### Added

#### CLI Tooling (`.claude/tools/`)
- `claude-context` CLI with commands: `init`, `validate`, `diagnose`, `config`
- Tech stack auto-detection for 10+ frameworks
- Placeholder replacement engine
- Validation suite (schemas, links, placeholders, structure, line numbers)
- Structured logging with operation tracking
- Environment-aware configuration loading

#### JSON Schemas (`.claude/schemas/`)
- `settings.schema.json` - Settings validation
- `manifest.schema.json` - Extension manifest validation
- `agent.schema.json` - Agent file structure
- `command.schema.json` - Command file structure
- `workflow.schema.json` - Workflow documentation
- `research.schema.json` - RPI research documents
- `plan.schema.json` - RPI plan documents

#### Configuration System (`.claude/config/`)
- `base.json` - Base configuration
- `environments/development.json` - Development overrides
- `environments/staging.json` - Staging overrides
- `environments/production.json` - Production overrides
- `local.json.example` - Template for local overrides

#### New Commands
- `/help` - Comprehensive help system with command/agent reference
- `/collab` - Team collaboration (handoff, sync, status)
- `/analytics` - Local usage statistics and context metrics

#### CI/CD Templates (`.claude/ci-templates/`)
- `github-actions/validate-docs.yml` - PR documentation validation
- `github-actions/context-check.yml` - Weekly context budget check

#### Team Collaboration (`.claude/team/`)
- `config.json` - Team settings, members, integrations
- `roles.json` - Role definitions with permissions

#### Shared Knowledge Base (`.claude/knowledge/`)
- `shared/decisions/` - Architecture Decision Records (ADRs)
- `shared/patterns/` - Reusable code patterns
- `sessions/` - Session handoff documents

#### Community Standards (`.claude/standards/`)
- `EXTENSION_GUIDELINES.md` - Extension publishing standards
- `QUALITY_CHECKLIST.md` - Quality requirements
- `COMPATIBILITY.md` - Version compatibility guide

#### Documentation (`docs/`)
- `QUICK_START_5MIN.md` - Zero-to-working guide
- `TROUBLESHOOTING.md` - Common issues catalog

#### Other
- `.claude/indexes/agents/CAPABILITY_MATRIX.md` - Agent selection guide
- Enhanced GitHub issue/PR templates

### Changed
- All commands updated with standardized frontmatter (version, outputs, examples)
- All agents updated with rich metadata (capabilities, workflows, hooks)
- `.claude/settings.json` - Added schema reference, validation, logging sections
- `.gitignore` - Added entries for logs, state, cache, analytics

---

## [1.0.0] - 2025-12-06

### Added
- Initial release of Claude Code Context Engineering Template
- Comprehensive directory structure with agents, commands, context, indexes, research, and plans
- Agent architecture with specialized agents (context-engineer, core-architect, database-ops, api-developer, integration-hub, deployment-ops)
- RPI (Research-Plan-Implement) workflow methodology
- Self-maintaining documentation system with verification commands
- Validation framework with quality standards
- Production-ready template with validation framework

### Known Limitations
- Template requires initialization with context-engineer agent for specific projects
- Line number accuracy target of ≥60% (configurable)
- Context budget management targets <40% utilization

## Future Improvements
- Enhanced validation tools
- Additional specialized agents
- Improved documentation generation capabilities
- Extended RPI workflow features
