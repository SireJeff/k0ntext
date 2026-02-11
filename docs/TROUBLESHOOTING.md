# Troubleshooting Guide

Common issues and solutions for K0ntext (v3.8.0).

---

## Quick Diagnosis

Run diagnostics to automatically detect issues:

```bash
# Check database and indexing status
k0ntext stats

# Validate context files
k0ntext validate

# Check for documentation drift
k0ntext drift-detect
```

---

## Issue Categories

1. [Installation Issues](#installation-issues)
2. [Initialization Failures](#initialization-failures)
3. [Context Budget Problems](#context-budget-problems)
4. [Validation Errors](#validation-errors)
5. [Agent/Command Issues](#agentcommand-issues)
6. [Performance Issues](#performance-issues)
7. [MCP Server Issues](#mcp-server-issues)

---

## Installation Issues

### TSG-001: CLI Tools Won't Install

**Symptoms:**
- `npm install -g k0ntext` fails
- Missing dependencies errors

**Diagnosis:**
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

**Solutions:**

**A. Update Node.js**
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18
```

**B. Clear npm cache**
```bash
npm cache clean --force
npm install -g k0ntext
```

**C. Windows users** - Use Node.js LTS (v18, v20, v22) for pre-built SQLite binaries. Non-LTS versions may require Visual Studio Build Tools.

---

### TSG-002: Template Files Not Found

**Symptoms:**
- "AI_CONTEXT.md not found" errors
- Missing `.claude/` directory

**Solutions:**

**A. Re-initialize project**
```bash
k0ntext init
```

**B. Sync templates manually**
```bash
k0ntext sync-templates
```

---

## Initialization Failures

### TSG-010: Tech Stack Not Detected

**Symptoms:**
- "Could not detect technology stack"
- Generic placeholders remain after initialization

**Diagnosis:**
```bash
# Check for expected files
ls package.json requirements.txt go.mod Cargo.toml pyproject.toml
```

**Solutions:**

**A. Provide explicit hint**
```bash
@context-engineer "Initialize for Python FastAPI with PostgreSQL"
```

**B. Create detection files**
If your project is non-standard, create a minimal detection file:
```bash
# For Python
echo "# Auto-generated for detection" > requirements.txt

# For Node
echo '{"name":"my-project"}' > package.json
```

**C. Manual initialization**
Edit `AI_CONTEXT.md` directly and replace `{{PLACEHOLDER}}` values manually.

---

### TSG-011: Too Many Workflows Discovered (>15)

**Symptoms:**
- Agent discovers 20+ workflows
- Documentation becomes unwieldy

**Solutions:**

**A. Let agent merge automatically**
The agent should merge related workflows. If not:
```bash
@context-engineer "Merge workflows: auth-login and auth-register into authentication"
```

**B. Focus on critical paths**
```bash
@context-engineer "Initialize focusing only on critical user paths"
```

---

### TSG-012: Too Few Workflows Discovered (<8)

**Symptoms:**
- Agent only finds 2-3 workflows
- Major functionality not documented

**Solutions:**

**A. Provide hints about areas to explore**
```bash
@context-engineer "Initialize and explore: user auth, payments, notifications, admin panel"
```

**B. Add workflows manually**
```bash
@context-engineer "Document workflow: [workflow-name]"
```

---

### TSG-013: Initialization Interrupted

**Symptoms:**
- `INIT_PROGRESS.json` exists
- Partial documentation

**Solutions:**

**A. Resume initialization**
```bash
k0ntext init
# Or in Claude Code:
@context-engineer "Resume initialization"
```

**B. Start fresh**
```bash
rm .k0ntext/INIT_PROGRESS.json
k0ntext init
```

---

## Context Budget Problems

### TSG-020: Context Budget Exceeded

**Symptoms:**
- Claude responses truncated
- "Context limit" warnings
- Degraded response quality

**Diagnosis:**
Check current utilization by reviewing loaded content.

**Solutions:**

**A. Use progressive loading**
1. Load category index first (~5k tokens)
2. Load only relevant domain index (~15k tokens)
3. Load specific workflow only when needed

**B. Compact current context**
Ask Claude to summarize and archive current findings:
```
Summarize findings so far and archive. I need to load fresh context.
```

**C. Start fresh session**
For complex tasks, create a handoff document and start new session:
```bash
/collab handoff
```

---

### TSG-021: High Token Usage for Simple Tasks

**Symptoms:**
- 60%+ context utilization for basic tasks
- Loading unnecessary documentation

**Solutions:**

**A. Follow the 3-level chain**
Don't load detail files unless needed:
```
Level 1: CATEGORY_INDEX.md (~5k)
Level 2: domain index (~15k)
Level 3: workflow detail (~40k) - only if implementing
```

**B. Use targeted searches**
Instead of loading entire workflow:
```
Search for the specific function: [function name] in [file pattern]
```

---

## Validation Errors

### TSG-030: Schema Validation Failed

**Symptoms:**
- `settings.json` validation errors
- Invalid configuration

**Diagnosis:**
```bash
k0ntext validate --strict
```

**Solutions:**

**A. Auto-fix with validation**
```bash
k0ntext validate --fix
```

**B. Manual fix**
Compare your `settings.json` with the schema in `.claude/schemas/settings.schema.json`.

---

### TSG-031: Broken Markdown Links

**Symptoms:**
- Links to files that don't exist
- 404 in documentation navigation

**Diagnosis:**
```bash
k0ntext validate
```

**Solutions:**

**A. Update links after file moves**
After refactoring, update documentation:
```bash
# Find all references to old path
grep -r "old/path" .claude/
# Update to new path
```

**B. Regenerate affected workflows**
```bash
@context-engineer "Refresh workflow: [workflow-name]"
```

---

### TSG-032: Line Numbers Outdated

**Symptoms:**
- `file:line` references point to wrong code
- Accuracy below 60% threshold

**Diagnosis:**
```bash
k0ntext validate
```

**Solutions:**

**A. Run verification for modified files**
```bash
/verify-docs-current path/to/modified/file.py
```

**B. Refresh all workflows**
```bash
@context-engineer "Audit and refresh all workflow documentation"
```

**C. Accept drift within tolerance**
Line numbers within ±10 lines are acceptable. Focus on function names as anchors.

---

### TSG-033: Remaining Placeholders

**Symptoms:**
- `{{PLACEHOLDER}}` text visible in AI_CONTEXT.md
- Incomplete initialization

**Diagnosis:**
```bash
k0ntext validate
```

**Solutions:**

**A. Complete initialization**
```bash
@context-engineer "Complete placeholder replacement"
```

**B. Manual replacement**
Search and replace remaining placeholders in AI_CONTEXT.md with actual values.

---

## Agent/Command Issues

### TSG-040: Agent Not Found

**Symptoms:**
- "@agent-name" doesn't work
- "Agent not recognized" errors

**Solutions:**

**A. Check agent exists**
```bash
ls .claude/agents/
```

**B. Use correct invocation**
```bash
# Correct
@context-engineer "task description"

# Not
/context-engineer "task description"
```

---

### TSG-041: Command Not Found

**Symptoms:**
- "/rpi-research" doesn't work
- Command not recognized

**Solutions:**

**A. Check command exists**
```bash
ls .claude/commands/
```

**B. Verify command is registered**
Check `settings.json` includes the command:
```json
  "commands": {
    "rpi_commands": ["/rpi-research", "/rpi-plan", "/rpi-implement"],
    "validation_commands": ["/context-optimize"]
  }
```

---

## Performance Issues

### TSG-050: Slow Initialization

**Symptoms:**
- Initialization takes 30+ minutes
- Agent seems stuck

**Solutions:**

**A. For large codebases (>100k LOC)**
```bash
@context-engineer "Initialize focusing on src/ directory only"
```

**B. Skip intelligent analysis**
```bash
k0ntext init --no-intelligent
```

---

### TSG-051: Slow Validation

**Symptoms:**
- Validation takes several minutes
- Especially on large documentation sets

**Solutions:**

**A. Use quick validation**
```bash
k0ntext validate
```

**B. Skip external link checking**
Ensure this is disabled (default):
```json
"validation": {
  "link_check_external": false
}
```

---

## MCP Server Issues

### TSG-060: MCP Server Won't Start

**Symptoms:**
- `k0ntext mcp` exits immediately
- "Database not found" or "Missing OPENROUTER_API_KEY"

**Diagnosis:**
```bash
k0ntext stats
```

**Solutions:**

**A. Initialize the database first**
```bash
k0ntext init
k0ntext index
```

**B. Set the OpenRouter API key**
```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

**C. Start the server**
```bash
k0ntext mcp
```

---

### TSG-061: MCP Sync Exports Missing

**Symptoms:**
- Sync finishes without generating files
- Output files remain unchanged

**Solutions:**

**A. Force sync**
```bash
k0ntext sync --force
```

**B. Recreate database index**
```bash
rm -f .k0ntext.db
k0ntext init
k0ntext index
```

**C. Ensure database exists**
```bash
ls -la .k0ntext.db
```

---

### TSG-062: Generate Command Failed

**Error:** `Failed to generate context files`

**Diagnosis:**
1. Check if database is initialized: `k0ntext stats`
2. Verify OpenRouter API key is set
3. Check file permissions for output directory

**Solution:**
```bash
# Re-initialize database
k0ntext init
k0ntext index

# Retry generation
k0ntext generate
```

---

### TSG-063: Sync Command Failed

**Error:** `Synchronization failed`

**Diagnosis:**
1. Check sync status: `k0ntext sync --check`
2. Verify tool configurations exist
3. Check for conflicts

**Solution:**
```bash
# Check status
k0ntext sync --check

# Force sync if needed
k0ntext sync --force

# Sync from specific tool
k0ntext sync --from claude
```

---

### TSG-064: MCP Server Build Issues

**Error:** `MCP server failed to start`

**Diagnosis:**
1. Verify build: `npm run build`
2. Check that database file exists
3. Verify OpenRouter API key

**Solution:**
```bash
# Rebuild
npm run build

# Test MCP server
npm run start:mcp
```

---

## Getting Help

If your issue isn't listed:

1. **Run diagnostics:**
   ```bash
   k0ntext stats
   k0ntext validate -v
   ```

2. **Report an issue:**
   https://github.com/SireJeff/k0ntext/issues

Include:
- Error message
- Diagnostic output (`k0ntext stats`)
- Tech stack
- Steps to reproduce
