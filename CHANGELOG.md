# Changelog

All notable changes to the `k0ntext` package will be documented in this file.

## [3.5.0] - 2026-02-09

### 🎉 Template Sync System Release

### Added

#### Template Sync System
- **`k0ntext sync-templates`** - New command to sync `.claude/` templates from package `templates/base/`
  - Automatically syncs commands/, agents/, schemas/, standards/, tools/, automation/ from package
  - Excludes context/ and indexes/ (user-specific directories)
  - Hash-based change detection using SHA-256 (16 char slice)
  - Auto-merge for safe updates (template changed, file not modified by user)
  - Interactive conflict resolution with prompts
  - Backup creation before overwrites
  - Archival of removed files to `.k0ntext/archive/`
  - Dual manifest storage: Database (`.k0ntext.db`) + File (`.claude/.k0ntext-manifest.json`)
  - Dry-run mode with `--dry-run` flag
  - Force mode with `--force` flag (skip prompts, overwrite conflicts)
  - Verbose mode with `-v, --verbose` flag
  - Selective sync with `--subdirs` flag

- **`k0ntext template-status`** - New command to show template sync status
  - Displays current template version vs package version
  - Shows user-modified files count
  - Verbose mode with detailed file listings

#### Clean Architecture Implementation
- **`src/template-sync/`** - New module with 10 focused components:
  - `types.ts` - All type definitions (20+ interfaces)
  - `hasher.ts` - Hash utilities (SHA-256, 16 char slice)
  - `scanner.ts` - Directory scanning with exclude patterns
  - `manifest.ts` - Dual manifest management (DB + file)
  - `comparator.ts` - File comparison and state detection
  - `merger.ts` - Auto-merge strategies with diff generation
  - `conflict-resolver.ts` - Interactive prompts with @inquirer/prompts
  - `engine.ts` - Main sync orchestrator
  - `index.ts` - Module exports

#### Database Schema Updates
- **SCHEMA_VERSION** - Updated from `1.2.0` to `1.3.0`
- **New table: `template_manifests`** - Stores manifest JSON with version tracking
  - `id`, `k0ntext_version`, `template_version`, `manifest`, `created_at`, `updated_at`
- **New table: `template_files`** - Tracks individual template file versions
  - `id`, `relative_path`, `template_hash`, `template_version`, `user_modified`, `last_synced_at`, `synced_at`, `original_hash`, `metadata`
- **New indexes**:
  - `idx_template_manifests_version` on `template_manifests(template_version)`
  - `idx_template_files_path` on `template_files(relative_path)`
  - `idx_template_files_version` on `template_files(template_version)`
  - `idx_template_files_user_modified` on `template_files(user_modified)`
  - `idx_template_files_hash` on `template_files(template_hash)`

#### Init Command Integration
- **Automatic template sync** - Runs during `k0ntext init`
  - Checks if template sync is needed
  - Syncs templates from package to `.claude/`
  - Shows sync summary (updated, created, conflicts)
  - Can be skipped with `--no-template-sync` flag

#### New CLI Commands (2)
1. **`k0ntext sync-templates`** - Sync `.claude/` templates from package
   - `--dry-run` - Show changes without applying
   - `--force` - Auto-overwrite conflicts without prompting
   - `--subdirs <dirs>` - Comma-separated subdirectories to sync
   - `-v, --verbose` - Show detailed output including diffs
   - `--no-archive` - Skip archiving removed files

2. **`k0ntext template-status`** - Show template sync status
   - `-v, --verbose` - Show detailed status with file listings

#### New Options
- **`k0ntext init --no-template-sync`** - Skip template synchronization during initialization

### New Files Created (13)
1. `src/template-sync/types.ts` - Type definitions (20+ interfaces)
2. `src/template-sync/hasher.ts` - Hash utilities
3. `src/template-sync/scanner.ts` - Directory scanning
4. `src/template-sync/manifest.ts` - Manifest management
5. `src/template-sync/comparator.ts` - File comparison
6. `src/template-sync/merger.ts` - Auto-merge strategies
7. `src/template-sync/conflict-resolver.ts` - Conflict resolution prompts
8. `src/template-sync/engine.ts` - Main sync orchestrator
9. `src/template-sync/index.ts` - Module exports
10. `src/cli/commands/sync-templates.ts` - CLI commands

### Modified Files (3)
1. **`src/db/schema.ts`** - Added template_manifests and template_files tables, SCHEMA_VERSION 1.3.0
2. **`src/db/client.ts`** - Applied TEMPLATE_SCHEMA_SQL in initSchema()
3. **`src/cli/index.ts`** - Added sync-templates and template-status commands, init integration

### Template Sync Features
- **Hash-based detection** - SHA-256 (16 char) for consistency with DatabaseClient
- **File state classification** - identical, safe-update, conflict, new, deleted, user-only
- **Auto-merge strategies** - Safe updates automatically applied, conflicts prompt user
- **Conflict resolution** - Interactive prompts (show-diff, keep-local, overwrite, skip)
- **Batch resolution** - For multiple conflicts: keep-all, overwrite-all, or individual
- **Backup before overwrite** - Automatic backups to `.k0ntext/backups/`
- **Archive removed files** - Moved to `.k0ntext/archive/` with timestamp
- **Dual manifest tracking** - Database + file (`.claude/.k0ntext-manifest.json`)
- **Version tracking** - Tracks k0ntext version and template version
- **User modification detection** - Preserves user changes, prompts before overwrite
- **Selective sync** - Can sync specific subdirectories (commands, agents, etc.)

### Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Template sync | ❌ None | ✅ Full | ✅ Complete |
| `.claude/` initialization | ❌ Manual | ✅ Automatic | ✅ Complete |
| User modification detection | ❌ None | ✅ Hash-based | ✅ Complete |
| Conflict resolution | ❌ None | ✅ Interactive | ✅ Complete |
| CLI commands | 20 | 22 | ✅ +2 |
| Database schema | 1.2.0 | 1.3.0 | ✅ Migrated |
| Template-sync module files | 0 | 10 | ✅ Created |

### Usage Examples

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

# Check sync status
k0ntext template-status

# Detailed status with file listings
k0ntext template-status --verbose

# Skip template sync during init
k0ntext init --no-template-sync
```

### Fixed

#### Template Sync Bug Fixes
- **User modification detection** - Fixed `needsSync()` to detect user modifications made after initial sync
  - Previously only checked package version changes
  - Now performs full comparison to detect any file changes
  - Properly flags conflicts when files differ from manifest

- **Path resolution** - Fixed template path resolution in `sync-templates` command
  - Corrected path from `../../templates/base` to `../../../templates/base`
  - Ensures templates are found from compiled `dist/cli/commands/` location
  - Prevents "0 files found" issue and incorrect archiving behavior

- **Force sync** - Fixed `--force` flag to actually apply file overwrites
  - Previously set resolutions but never executed them
  - Now properly overwrites conflict files when force is specified
  - Resolutions are correctly tracked and excluded from conflict counts

- **Conflict detection** - Enhanced comparator to detect post-manifest modifications
  - Files modified after manifest creation are now properly flagged
  - `userModified` flag is set when local hash differs from manifest hash
  - Ensures users are prompted about their customizations

### Breaking Changes
- None - fully backward compatible with v3.4.0

---

## [3.4.0] - 2026-02-09

### 🎉 Config Sync & Template Enhancement Release

### Added

#### Version Detection System
- **`k0ntext check`** - New command to check if context files are outdated
  - Detects version markers in existing files (`*Generated by k0ntext vX.Y.Z*`)
  - Compares against current package version
  - Shows update type (major/minor/patch) with emoji indicators
  - Integrates into `init` command with `--no-version-check` option
- **`src/cli/version/`** - New module with parser, comparator, checker, and prompt utilities
- Version tracking in database with `k0ntext_version`, `user_modified`, `last_checked` columns

#### User Modification Handling
- **Automatic change detection** - SHA-256 hash comparison to detect user edits
- **Backup creation** - Creates backups before overwriting modified files
  - **File-copy strategy** - Direct file backup to `.k0ntext/backups/`
  - **Git stash fallback** - Uses git stash when file-copy fails
- **Interactive prompts** - Asks user before overwriting modified files
- **`src/cli/utils/file-detector.ts`** - FileModificationDetector with path normalization
- **`src/cli/utils/backup-manager.ts`** - BackupManager with dual backup strategies
- **`src/cli/utils/modification-prompt.ts`** - Interactive prompts for modified files

#### Backup & Restore System
- **`k0ntext restore`** - New command to restore AI tool config files from backups
  - `--list` - List available backups
  - `--backup <path>` - Restore from specific backup path
  - `--tool <name>` - Filter by tool name
  - `--force` - Restore without confirmation
  - Interactive mode with backup selection
- **`src/cli/commands/restore.ts`** - Complete restore command implementation

#### Template Engine Enhancement
- **Handlebars integration** - Rich template-based content generation
  - **`src/template-engine/engine.ts`** - TemplateEngine with caching and partials
  - **`src/template-engine/helpers.ts`** - 15 custom Handlebars helpers (join, first, truncate, slugify, formatDate, eq, ne, and, or, defaults, json, keys, values, length)
  - **`src/template-engine/data-transformer.ts`** - Build rich context from database
  - **`src/template-engine/types.ts`** - Template data model
- **Fallback support** - Graceful fallback to inline functions when templates unavailable
- **Rich project data** - Generated files now include actual project metadata instead of placeholders

#### Database Schema Updates
- **SCHEMA_VERSION** - Updated from `1.0.0` to `1.2.0`
- **New table: `generated_files`** - Tracks all generated files with:
  - `id`, `tool`, `file_path`, `content_hash`, `backup_path`
  - `generated_at`, `last_verified_at`, `user_modified`, `metadata` (JSON)
- **New columns in `sync_state`**:
  - `k0ntext_version` - Tracks k0ntext version used for generation
  - `user_modified` - Boolean flag for user modifications
  - `last_checked` - Timestamp of last version check
- **New indexes**:
  - `idx_sync_state_version` on `sync_state(k0ntext_version)`
  - `idx_sync_state_user_modified` on `sync_state(user_modified)`
  - `idx_generated_files_tool` on `generated_files(tool)`
  - `idx_generated_files_hash` on `generated_files(content_hash)`

#### Enhanced Generation Flow
- **Version tracking after generation** - Stores version and hash in database
- **Modification detection in `generate`** - Detects edited files before overwriting
- **User prompts** - Interactive prompts for handling modified files
- **Backup before overwrite** - Automatic backup creation before regenerating

### New CLI Commands (2)
1. **`k0ntext check`** - Check if context files are outdated
   - `--update` - Prompt to update outdated files
   - `--force` - Update without prompting
   - `-v, --verbose` - Show detailed output
2. **`k0ntext restore`** - Restore AI tool config files from backups
   - `--list` - List available backups
   - `--backup <path>` - Restore from specific backup
   - `--tool <name>` - Filter by tool name
   - `--force` - Restore without confirmation

### New Options
- **`k0ntext init --no-version-check`** - Skip version checking during initialization

### New Files Created (17)
1. `src/cli/version/types.ts` - Version detection type definitions
2. `src/cli/version/parser.ts` - Version string parsing (5 patterns supported)
3. `src/cli/version/comparator.ts` - Semver comparison utilities
4. `src/cli/version/checker.ts` - Single file and batch checking
5. `src/cli/version/prompt.ts` - Interactive prompts for version updates
6. `src/cli/version/index.ts` - Module exports
7. `src/cli/commands/version-check.ts` - `k0ntext check` command
8. `src/cli/utils/file-detector.ts` - File modification detector
9. `src/cli/utils/backup-manager.ts` - Backup management
10. `src/cli/utils/modification-prompt.ts` - Modification handling prompts
11. `src/cli/commands/restore.ts` - `k0ntext restore` command
12. `src/template-engine/types.ts` - Template data model
13. `src/template-engine/helpers.ts` - Custom Handlebars helpers
14. `src/template-engine/data-transformer.ts` - Build rich context from DB
15. `src/template-engine/engine.ts` - Template engine with caching
16. `src/template-engine/index.ts` - Module exports
17. `templates/handlebars/` - Handlebars template directory

### Modified Files (5)
1. **`src/db/schema.ts`** - Added generated_files table, sync_state columns, indexes
2. **`src/db/client.ts`** - Made `hashContent()` public, added version tracking methods
3. **`src/cli/generate.ts`** - Integrated template engine, modification detection, version tracking
4. **`src/cli/index.ts`** - Added `check` and `restore` commands, `--no-version-check` option
5. **`package.json`** - Added `handlebars@^4.7.0` dependency

### New Unit Tests (74)
1. **`tests/version-detection.test.ts`** - 48 tests covering:
   - Version parsing (5 formats)
   - Version comparison (major, minor, patch)
   - Database operations
   - Checker integration
2. **`tests/modification-detection.test.ts`** - 26 tests covering:
   - FileModificationDetector (checkFile, checkAll, getModifiedFiles)
   - BackupManager (createBackup, restoreFromBackup, listBackups, cleanupOldBackups)
   - Git stash backup integration
   - Edge cases (concurrent modifications, special characters, empty files, large files)

### Test Coverage
- **Before**: 82 tests
- **After**: 156 tests
- **New**: 74 tests
- **All tests passing**: ✅

### Breaking Changes
- None - fully backward compatible with v3.3.1

### Version Marker Formats Supported
1. `*Generated by k0ntext v3.3.1*` - K0ntext format
2. `> **Version:** 3.3.1` - Bold format
3. `> Version: 3.3.1` - Simple format
4. `"generator_version": "3.3.1"` - JSON format
5. `<!-- Version: 3.3.1 -->` - HTML comment format

### Backup File Naming
- File-copy backups: `{filename}.{timestamp}.bak`
  - Example: `AI_CONTEXT.md.2026-02-09T14.30.45.123Z.bak`
- Git stash backups: `git-stash:stash@{n}`

### Template Engine Features
- **15 Custom Helpers**: join, first, truncate, slugify, formatDate, eq, ne, and, or, defaults, json, keys, values, length, default
- **Data Source**: Database (context items, tech stack, architecture, commands, workflows, gotchas)
- **Output**: Rich 2-5KB files vs previous 26-273 bytes
- **Fallback**: Inline functions when template unavailable or `--map` format

### Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Version detection | ❌ None | ✅ Full | ✅ Complete |
| User modification handling | ❌ None | ✅ Full | ✅ Complete |
| Backup before overwrite | ❌ None | ✅ Dual strategy | ✅ Complete |
| Template engine | ❌ Inline only | ✅ Handlebars | ✅ Complete |
| CLI commands | 18 | 20 | ✅ +2 |
| Unit tests | 82 | 156 | ✅ +74 |
| Database schema | 1.0.0 | 1.2.0 | ✅ Migrated |

### Usage Examples

```bash
# Check for outdated context files
k0ntext check

# Check with detailed output
k0ntext check -v

# Prompt to update outdated files
k0ntext check --update

# Force update without prompts
k0ntext check --update --force

# List available backups
k0ntext restore --list

# Restore from specific backup
k0ntext restore --backup "AI_CONTEXT.md.2026-02-09T14.30.45.123Z.bak"

# Restore for specific tool
k0ntext restore --tool claude --list

# Interactive restore mode
k0ntext restore

# Skip version checking during init
k0ntext init --no-version-check
```

---

## [3.3.1] - 2026-02-09

### 🎨 Enhanced TUI Panels for REPL Shell

### Added

#### Advanced Search Panel
- **Filtered search** with `--type`, `--sort`, `--order`, `--limit` flags
- **Type-based emoji indicators** for doc, code, config, workflow, agent, command, commit, knowledge
- **Content previews** with highlighted query terms in results
- **Sortable results** by relevance, name, date, or size

#### Configuration UI Panel
- **Interactive configuration editor** using @inquirer/prompts
- **4 config categories**: Project, AI Tools, Features, Display
- **Validation and persistence** to `.k0ntext/config.json`
- **Type-safe editing** with select, checkbox, and text inputs

#### Indexing Progress Visualizer
- **Real-time progress tracking** with ora spinner integration
- **Multi-stage display**: discovering, indexing docs/code/tools, generating embeddings
- **File-level updates** showing current file being processed
- **Error tracking** with inline error counts and completion statistics

#### Drift Detection Display
- **Three-axis drift analysis**: file dates, structure changes, git diff
- **Severity-based reporting** with color-coded indicators (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Good)
- **Database-driven file date analysis** using indexed item timestamps
- **Git integration** for uncommitted change detection
- **Actionable recommendations** based on drift severity

### New Files
- `src/cli/repl/tui/panels/search.ts` - Advanced search panel
- `src/cli/repl/tui/panels/config.ts` - Configuration UI panel
- `src/cli/repl/tui/panels/indexing.ts` - Indexing progress visualizer
- `src/cli/repl/tui/panels/drift.ts` - Drift detection display
- `tests/tui-panels.test.ts` - 68 unit tests for all 4 panels

### Changed
- `src/cli/repl/index.ts` - Integrated all 4 panels into the REPL shell
- `package.json` - Version bump to 3.3.1

### Testing
- 82 total tests (14 existing + 68 new TUI panel tests)
- All tests passing

---

## [3.3.0] - 2026-02-08

### 🚀 Interactive REPL Shell & Redesigned Init Experience

### Added

#### New REPL Shell Mode (`k0ntext shell` or `k0ntext`)
- **Interactive shell** for managing k0ntext context with live commands
- **Auto-start on no arguments**: Running `k0ntext` with no arguments starts the REPL shell
- **Session persistence**: Command history and stats saved across sessions
- **Built-in commands**: help, stats, index, search, config, drift, init, update, exit

#### New Init Wizard
- **Interactive prompts** using @inquirer/prompts for modern CLI experience
- **Step-by-step setup**:
  1. OpenRouter API Key (with validation)
  2. Project Type selection (Monorepo, Web App, Library, API, CLI Tool)
  3. AI Tools selection (Claude, Copilot, Cursor, Windsurf, Aider, Continue, Cline)
  4. Feature selection (Stats, Search, Docs, Drift Detection, MCP, Workflows)
  5. Embeddings generation choice

#### New Orange Gradient Theme
- **Orange gradient primary** with purple/pink/cyan accents
- **Beautiful box borders** with Unicode/ASCII fallback
- **Progress bars** for visual feedback
- **Terminal capability detection** for graceful degradation

#### Update Checker
- **Automatic version checking** on REPL start
- **Update notifications** with type indicators (major/minor/patch)
- **npm update instructions** included

### New Files
- `src/cli/repl/index.ts` - Main REPL shell
- `src/cli/repl/core/session.ts` - Session management
- `src/cli/repl/core/parser.ts` - Command parsing and execution
- `src/cli/repl/tui/theme.ts` - Orange gradient theme system
- `src/cli/repl/init/wizard.ts` - Interactive init wizard
- `src/cli/repl/update/checker.ts` - Version checking

### Changed
- `package.json` - Added @inquirer/prompts@^5.0.0, blessed@^0.1.81 dependencies
- `src/db/client.ts` - Added `path` property to `getStats()` return type
- `src/cli/index.ts` - Added shell command and default to REPL when no args

### Usage

```bash
# Start REPL shell (auto-init if first time)
k0ntext

# Start shell explicitly
k0ntext shell

# Available commands in REPL:
help, stats, index, search, config, drift, init, update, exit
```

---

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
