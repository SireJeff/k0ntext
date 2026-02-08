# k0ntext v3.2.0 Release Notes

## 🚀 Monorepo Batch Indexing

**Release Date:** 2026-02-08

## 📦 What's New

### New Command: `index:batch`

A powerful new command for indexing large monorepos that automatically detects module structure and processes each module with configurable limits.

**Key Features:**

- **Auto-Detects Monorepo Structure**: Scans for common module directories (backend/, frontend/, core/, packages/, services/, apps/, docs/, devops/)
- **Submodule Discovery**: Recursively finds submodules within each main module
- **Per-Module File Limits**: Configurable `--max-files` limit per module (default: 500)
- **Batch Processing**: Splits large modules into batches of 100 files (configurable)
- **Progress Tracking**: Shows detailed progress for each module with file counts
- **Skip Embeddings**: `--skip-embeddings` flag for faster indexing without semantic search

## 🔧 Why This Matters

The previous `index` command had a hardcoded limit of 100 code files, which was insufficient for large monorepos:

- **deadlinekiller-reorg** has ~2,875 code files across multiple modules
- **synap5e** alone has 2,052 Python files
- Would require 28+ manual index runs to cover everything

With `index:batch`, you can index your entire monorepo in a single command.

## 📝 Usage

```bash
# Basic usage - auto-detect and index all modules
npx k0ntext index:batch

# Increase per-module limit for very large codebases
npx k0ntext index:batch --max-files 1000

# Skip embeddings for faster indexing
npx k0ntext index:batch --skip-embeddings

# Verbose output for debugging
npx k0ntext index:batch -v

# Custom batch size
npx k0ntext index:batch --batch-size 200 --max-files 1000
```

## 📊 Example Output

```
╔═══════════════════════════════════════════════════════════════╗
║  K0ntext Batch Index                                     ║
║  Monorepo-aware batch indexing for large codebases        ║
╚═══════════════════════════════════════════════════════════════╝

Detected Modules:
  • root                    (953 files) - Root configuration and documentation
  • backend                 (475 files) - backend module
  • frontend                (396 files) - frontend module
  • core                    (66 files) - core module
  • docs                    (6 files) - docs module
  • devops                  (5 files) - devops module
  • frontend/DLKFTD-1       (267 files) - DLKFTD-1 submodule
  • frontend/DLKFTD-2       (129 files) - DLKFTD-2 submodule

Batch Index Summary:
  • Modules Processed:  8
  • Documentation Files: 472
  • Code Files:         1564
  • Config Files:       463
  • Embeddings:         0
  • Total Indexed:      2499 files
```

## 🎯 Command Options

| Option | Default | Description |
|--------|---------|-------------|
| `--batch-size <n>` | 100 | Files per batch |
| `--max-files <n>` | 500 | Maximum files per module |
| `--skip-embeddings` | false | Skip generating embeddings |
| `-v, --verbose` | false | Show detailed output |

## 🐛 Bug Fixes

None - this is a feature release.

## 📝 Documentation Updates

- Added `index:batch` command to CLI reference
- Updated CHANGELOG.md with v3.2.0 entry

## 📊 Statistics

- **Files Added:** 1
- **Lines Added:** ~530
- **Tests Passing:** 14/14 ✅
- **Build Status:** Passing ✅

## 🔧 Installation

```bash
# Install globally
npm install -g k0ntext@latest

# Or update existing installation
npm update -g k0ntext
```

## 🚀 Quick Start for Monorepos

```bash
# 1. Initialize (MCP auto-configured)
npx k0ntext init

# 2. Index your entire monorepo
npx k0ntext index:batch --max-files 1000

# 3. Start MCP server
npx k0ntext mcp

# 4. Search your codebase
npx k0ntext search "how does auth work"
```

## 🏆 Recommended Workflow for deadlinekiller-reorg

```bash
# Clean start - remove old database
rm -f .k0ntext.db

# Initialize with intelligent analysis
npx k0ntext init

# Batch index everything with higher limits
npx k0ntext index:batch --max-files 1000

# Check stats
npx k0ntext stats

# Generate AI tool contexts
npx k0ntext generate --force
```

## ⚠️ Known Issues

**None** - All tests passing, no known issues.

## 🙏 Acknowledgments

Thanks to all users who provided feedback on v3.1.1 and requested monorepo support!

## 📋 Migration from v3.1.1

No breaking changes. Simply update:

```bash
npm update -g k0ntext
```

The new `index:batch` command is available immediately after update.

---

**Full Changelog:** https://github.com/SireJeff/k0ntext/blob/main/CHANGELOG.md
**npm Package:** https://www.npmjs.com/package/k0ntext
