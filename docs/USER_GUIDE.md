# K0ntext User Guide

**Complete guide to using k0ntext for AI-assisted development with Claude Code and other AI tools.**

---

## Table of Contents

- [Part 1: Getting Started](#part-1-getting-started)
- [Part 2: Slash Commands Reference](#part-2-slash-commands-reference)
- [Part 3: Agent System](#part-3-agent-system)
- [Part 4: RPI Workflow](#part-4-rpi-workflow)
- [Part 5: Coding Session Workflows](#part-5-coding-session-workflows)
- [Appendix](#appendix)

---

<details>
<summary><b>📖 Part 1: Getting Started</b></summary>

### What `k0ntext init` Creates

When you run `k0ntext init` in your project, k0ntext analyzes your codebase and creates a comprehensive AI context engineering system. Here's what gets created:

```
your-project/
├── .k0ntext.db              # SQLite database (vector search, embeddings)
├── .k0ntext/                # K0ntext internal directory
├── .claude/                 # Claude Code context (synced from templates)
│   ├── agents/              # 6 agent definitions
│   ├── commands/            # 12 custom slash commands
│   ├── schemas/             # JSON validation schemas
│   ├── standards/           # Quality guidelines
│   ├── tools/              # CLI tooling
│   ├── automation/          # Generators & hooks
│   ├── config/              # Environment configs
│   ├── team/               # Team collaboration
│   ├── knowledge/           # Shared knowledge base
│   ├── plans/              # RPI plan templates
│   ├── research/            # Research templates
│   ├── session/            # Checkpoints & history
│   ├── context/            # Pre-computed knowledge
│   ├── indexes/            # Category indexes
│   ├── ci-templates/       # CI/CD workflows
│   ├── sync/               # Sync state files
│   └── README.md          # System documentation
├── AI_CONTEXT.md            # Claude/Cursor context
├── .github/copilot-instructions.md  # GitHub Copilot
├── .clinerules             # Cline
├── .cursorrules            # Cursor
└── ... (other AI tool configs)
```

### Understanding Your `.claude/` Directory

The `.claude/` directory is your control center for AI-assisted development. After initialization:

| Directory | Purpose |
|-----------|---------|
| `agents/` | Contains 6 specialized agents (@context-engineer, @core-architect, etc.) |
| `commands/` | Contains 12 slash commands (/rpi-research, /help, etc.) |
| `indexes/` | Category indexes for efficient context loading |
| `plans/` | Active and completed RPI plans |
| `research/` | Active and completed research documents |
| `session/` | Checkpoints and session history |

### Immediate Capabilities After Init

After running `k0ntext init`, you immediately have access to:

1. **12 Slash Commands** - Quick workflows for common tasks
2. **6 Specialized Agents** - Domain-specific AI assistants
3. **RPI Workflow** - Structured development methodology
4. **Semantic Search** - Find relevant code instantly
5. **Cross-Tool Sync** - Keep all AI tools aligned

### First Steps After Initialization

```bash
# 1. Check what was indexed
k0ntext stats

# 2. Explore your codebase with semantic search
k0ntext search "authentication"

# 3. Review the context system
cat .claude/README.md

# 4. Try your first slash command
/help
```

---

`★ Insight ─────────────────────────────────────`
**Initialization is Just the Beginning**: The `.claude/` directory becomes a living system that evolves with your codebase. The templates synced during initialization are designed to be updated as your project grows - use `/context-optimize` to keep them fresh.
`─────────────────────────────────────────────────`

</details>

---

<details>
<summary><b>⚡ Part 2: Slash Commands Reference</b></summary>

K0ntext provides 12 slash commands for efficient AI-assisted development. These commands are available in Claude Code after running `k0ntext init`.

### Command Quick Decision Table

| Situation | Use Command |
|-----------|--------------|
| "I need help" | `/help` |
| "Starting new feature work" | `/rpi-research [feature-name]` |
| "Ready to design implementation" | `/rpi-plan [feature-name]` |
| "Plan approved, time to code" | `/rpi-implement [feature-name]` |
| "Just modified code, verify docs" | `/verify-docs-current [file]` |
| "About to PR/deploy" | `/validate-all` |
| "Want to improve context system" | `/context-optimize` |
| "After code changes, sync docs" | `/auto-sync --fix` |
| "Taking a break, save work" | `/session-save --checkpoint 'description'` |
| "Back from break, resume work" | `/session-resume --last` |
| "Check my usage patterns" | `/analytics` |
| "Working with team" | `/collab handoff` |

### Command Categories

- **RPI Orchestration:** `/rpi-research`, `/rpi-plan`, `/rpi-implement`
- **Validation:** `/verify-docs-current`, `/validate-all`
- **System:** `/help`, `/analytics`, `/session-save`, `/session-resume`
- **Optimization:** `/context-optimize`, `/auto-sync`
- **Team:** `/collab`

---

<details>
<summary><b>/help</b> - Command Reference</summary>

**When to use:** Any time you need help with commands, agents, or workflows.

**Example prompts:**
```bash
/help                           # Show all commands and agents
/help commands                  # Detailed command reference
/help agents                    # Agent capability overview
/help rpi                       # RPI workflow deep dive
/help rpi-research              # Specific command help
```

**Expected output:**
- Overview of all commands and agents
- Quick reference tables
- Detailed explanations when requested

**Tips:**
- Use `/help rpi` to understand the Research-Plan-Implement workflow
- Check `/help agents` before invoking an agent for the first time

</details>

---

<details>
<summary><b>/rpi-research</b> - Research Phase</summary>

**When to use:** Before implementing any non-trivial feature or refactor.

**Example prompt:**
```
/rpi-research "add user authentication to the API"

The API should support JWT-based authentication with refresh tokens. Focus on:
1. Where should auth middleware be added?
2. How do we validate tokens?
3. What's the refresh flow?
4. Are there any existing auth utilities to reuse?
```

**Expected output:** Research document in `.ai-context/research/active/` with:
- 3-5 chunks of explored code
- Call chains with line numbers
- Dependencies identified
- 150-word summary

**Context budget:** ~50K tokens (25%)

**Tips:**
- Review the chunks before planning
- Use `/help rpi` for detailed RPI workflow info
- Research creates parallel chunks for efficient planning

</details>

---

<details>
<summary><b>/rpi-plan</b> - Plan Phase</summary>

**When to use:** After research completes, to design the implementation.

**Example prompt:**
```
/rpi-plan "user authentication"

Create an implementation plan that:
- Adds JWT middleware to API routes
- Implements token validation
- Adds refresh token endpoint
- Includes tests for all new functionality
```

**Expected output:** Plan document in `.ai-context/plans/active/` with:
- Chunk-based todolists (one per research chunk)
- File modification table with line numbers
- Test strategy per chunk
- Rollback plan

**Context budget:** ~35K tokens (17%)

**Tips:**
- Requires human approval before implementation
- Each chunk todolist is independently executable
- Plan references research chunks directly

</details>

---

<details>
<summary><b>/rpi-implement</b> - Implement Phase</summary>

**When to use:** After plan is approved, to execute the implementation.

**Example prompt:**
```
/rpi-implement "user authentication"
```

**Expected output:**
- Atomic changes per todo item
- Commits with descriptive messages
- Updated documentation
- Archived plan and research documents

**Golden Rule:** `ONE CHUNK → COMPLETE TODOLIST → MARK DONE → NEXT CHUNK`

**Context budget:** ~60K tokens (30%)

**Tips:**
- Process chunks in dependency order
- Each todo: change → test → commit
- Stop on test failures

</details>

---

<details>
<summary><b>/verify-docs-current</b> - Validate Documentation</summary>

**When to use:** After modifying code, to check if documentation is still accurate.

**Example prompt:**
```
/verify-docs-current src/services/auth.py
```

**Expected output:** Verification report with:
- Line number accuracy status
- Link validation results
- Overall status: HEALTHY / NEEDS UPDATE / STALE

**Context budget:** ~20K tokens (10%)

**Tips:**
- Run after any significant code changes
- Helps maintain documentation accuracy
- Use `/auto-sync --fix` to update shifted line numbers

</details>

---

<details>
<summary><b>/validate-all</b> - Complete Validation</summary>

**When to use:** Before creating PR or deploying.

**Example prompt:**
```
/validate-all
```

**Expected output:** Validation report with:
- Documentation validation status
- Test results
- Code quality checks
- Overall READY/NOT READY status

**Context budget:** ~40K tokens (20%)

**Tips:**
- Run as part of your pre-commit workflow
- Use with `k0ntext hooks install` for automation
- Critical for production readiness

</details>

---

<details>
<summary><b>/context-optimize</b> - Context Optimization</summary>

**When to use:** When you want to improve your context engineering system.

**Example prompt:**
```
/context-optimize
```

**Expected output:**
- Optimization TODO checklist with RPI phases
- Context audit report
- Redundant file identification
- Enhancement recommendations

**Context budget:** ~40K tokens (20%)

**Tips:**
- Interactive mode asks 4 scoping questions
- Use `--auto` for automatic scoping
- Recommends new agents/commands based on codebase

</details>

---

<details>
<summary><b>/auto-sync</b> - Auto Synchronize</summary>

**When to use:** After code changes to sync documentation automatically.

**Example prompts:**
```
/auto-sync --check          # Check for drift without changes
/auto-sync --fix            # Auto-fix shifted line numbers
/auto-sync --rebuild-map    # Force rebuild CODE_TO_WORKFLOW_MAP
```

**Expected output:** Sync report with:
- Drift detection results
- Files updated (with --fix)
- Rebuilt CODE_TO_WORKFLOW_MAP (with --rebuild-map)

**Drift levels:** HEALTHY, LOW, MEDIUM, HIGH, CRITICAL

**Tips:**
- Use `--check` for safe preview
- Integrates with git hooks for automatic sync
- Run `/validate-all` after sync

</details>

---

<details>
<summary><b>/session-save</b> - Session Management</summary>

**When to use:** Before taking a break or switching tasks.

**Example prompts:**
```
/session-save                              # Save current state
/session-save --checkpoint "After auth research"  # Named checkpoint
```

**Expected output:** Session state saved to:
- `.ai-context/session/current/state.json`
- Checkpoint file (if specified)

**What gets saved:**
- Session ID and phase
- Active task
- Files loaded
- Pending documentation updates

**Tips:**
- Automatic save every 5 minutes
- Use checkpoints for easy resumption
- Pair with `/collab handoff` for team handoff

</details>

---

<details>
<summary><b>/session-resume</b> - Session Management</summary>

**When to use:** After returning from a break or switching sessions.

**Example prompts:**
```
/session-resume              # Resume last session
/session-resume --list       # Show available sessions
/session-resume abc123       # Resume specific session
```

**Expected output:**
- Session summary display
- Files previously loaded
- Pending updates
- Resumption options

**Tips:**
- Use `--list` to see all available sessions
- Automatically loads context from previous session
- Archives completed sessions

</details>

---

<details>
<summary><b>/analytics</b> - Usage Analytics</summary>

**When to use:** To understand your usage patterns and context metrics.

**Example prompts:**
```
/analytics               # View usage statistics
/analytics context       # Show context budget metrics
/analytics export        # Export metrics to JSON
```

**Expected output:**
- Session count and duration
- Command usage frequency
- Agent invocation counts
- Context budget utilization
- Optimization recommendations

**Tips:**
- All data is local (privacy-first)
- Use for identifying usage patterns
- Export data for team analysis

</details>

---

<details>
<summary><b>/collab</b> - Team Collaboration</summary>

**When to use:** When working with a team or handing off work.

**Example prompts:**
```
/collab handoff       # Create session handoff
/collab sync          # Sync knowledge base
/collab status        # View team status
```

**Expected output:**
- Handoff document for next team member
- Knowledge base sync status
- Team configuration overview

**Tips:**
- Requires `.ai-context/team/config.json` setup
- Handoffs save to `.ai-context/knowledge/sessions/`
- Pair with `/session-save` for complete handoff

</details>

---

`★ Insight ─────────────────────────────────────`
**Slash Commands Are Workflows**: Each slash command isn't just a simple action - it's a complete workflow with multiple steps, context management, and integration with the k0ntext CLI. For example, `/rpi-research` spawns parallel agents, creates chunked output, and prepares everything for the planning phase.
`─────────────────────────────────────────────────`

</details>

---

<details>
<summary><b>🤖 Part 3: Agent System</b></summary>

K0ntext provides 6 specialized agents for domain-specific tasks. Agents can be invoked directly in Claude Code.

### All 6 Agents Explained

<details>
<summary><b>@context-engineer</b> - Initialization Agent</summary>

**Type:** Initialization Agent
**Complexity:** Very High
**Context Usage:** Up to 80K tokens (40%)

**Capabilities:**
- Tech stack detection
- Workflow discovery (8-15 workflows)
- Template population
- System validation
- Documentation generation

**When to use:**
- First-time project setup
- Documenting new workflows
- Refreshing existing documentation
- Full system audits

**Example invocations:**
```bash
@context-engineer "Initialize context engineering for this repository"
@context-engineer "Document workflow: payment-processing"
@context-engineer "Refresh workflow: user-authentication"
@context-engineer "Audit and refresh all workflows"
```

</details>

---

<details>
<summary><b>@core-architect</b> - Architecture Specialist</summary>

**Type:** Architecture Specialist
**Complexity:** High
**Context Usage:** ~50K tokens (25%)

**Capabilities:**
- System architecture design
- State machine analysis
- Dependency mapping
- Scalability planning
- High-level design patterns

**When to use:**
- System architecture design
- State machine implementation
- Dependency refactoring
- Performance planning

**Example invocations:**
```bash
@core-architect "Document system architecture"
@core-architect "Analyze state transitions in authentication flow"
@core-architect "Identify scalability bottlenecks"
@core-architect "Design authorization state machine"
```

</details>

---

<details>
<summary><b>@database-ops</b> - Database Specialist</summary>

**Type:** Database Specialist
**Complexity:** Medium-High
**Context Usage:** ~40K tokens (20%)

**Capabilities:**
- Schema design and validation
- Migration planning and execution
- Query optimization
- Data integrity checks
- Performance tuning

**When to use:**
- Database schema changes
- Migration planning
- Query optimization
- Data model design

**Example invocations:**
```bash
@database-ops "Document database schema"
@database-ops "Analyze query performance for user lookup"
@database-ops "Plan migration from v1 to v2 schema"
@database-ops "Design indexes for search optimization"
```

</details>

---

<details>
<summary><b>@api-developer</b> - API Specialist</summary>

**Type:** API Specialist
**Complexity:** Medium
**Context Usage:** ~35K tokens (17%)

**Capabilities:**
- API design (REST, GraphQL)
- Contract definition
- Endpoint documentation
- API testing strategies
- Version management

**When to use:**
- API endpoint design
- Contract validation
- API documentation generation
- Testing strategy planning

**Example invocations:**
```bash
@api-developer "Document API endpoints for user resources"
@api-developer "Validate API contracts"
@api-developer "Generate OpenAPI spec"
@api-developer "Design rate limiting strategy"
```

</details>

---

<details>
<summary><b>@integration-hub</b> - Integration Specialist</summary>

**Type:** Integration Specialist
**Complexity:** Medium-High
**Context Usage:** ~40K tokens (20%)

**Capabilities:**
- Third-party API integration
- Webhook handling
- Authentication management
- Rate limiting implementation
- Error handling for external services

**When to use:**
- Adding external service integrations
- Webhook endpoint design
- OAuth/authentication flows
- API client design

**Example invocations:**
```bash
@integration-hub "Document integration with Stripe"
@integration-hub "Analyze webhook endpoints"
@integration-hub "Review authentication flows"
@integration-hub "Design retry strategy for external API"
```

</details>

---

<details>
<summary><b>@deployment-ops</b> - DevOps Specialist</summary>

**Type:** DevOps Specialist
**Complexity:** High
**Context Usage:** ~45K tokens (22%)

**Capabilities:**
- CI/CD pipeline design
- Infrastructure as code
- Deployment strategies (blue-green, canary)
- Environment management
- Monitoring and rollback

**When to use:**
- CI/CD pipeline setup
- Deployment configuration
- Infrastructure design
- Monitoring setup

**Example invocations:**
```bash
@deployment-ops "Document deployment pipeline"
@deployment-ops "Review infrastructure configuration"
@deployment-ops "Plan rollback strategy"
@deployment-ops "Design blue-green deployment"
```

</details>

---

### Agent Selection Guide

```
START
  │
  ├── Is this initialization/setup? → @context-engineer
  │
  ├── Does it involve external APIs/webhooks? → @integration-hub
  │
  ├── Does it involve database changes? → @database-ops
  │
  ├── Does it involve API endpoints? → @api-developer
  │
  ├── Does it involve deployment/CI/CD? → @deployment-ops
  │
  └── Is it architecture/system design? → @core-architect
```

### Agent Selection Matrix

| Task Type | Primary Agent |
|-----------|---------------|
| First-time setup | @context-engineer |
| System architecture | @core-architect |
| State machines | @core-architect |
| Database schema | @database-ops |
| Migrations | @database-ops |
| Query optimization | @database-ops |
| API design | @api-developer |
| API contracts | @api-developer |
| External integrations | @integration-hub |
| Webhooks | @integration-hub |
| CI/CD pipelines | @deployment-ops |
| Infrastructure | @deployment-ops |

---

`★ Insight ─────────────────────────────────────`
**Agents Are Context-Aware**: Each agent has deep knowledge of your codebase through the indexed content. When you invoke an agent, it doesn't just provide generic advice - it references your actual files, workflows, and patterns with specific line numbers.
`─────────────────────────────────────────────────`

</details>

---

<details>
<summary><b>🔄 Part 4: RPI Workflow</b></summary>

The Research-Plan-Implement (RPI) workflow is k0ntext's core methodology for structured, error-free development.

### Overview

**Philosophy:** RPI prevents "slop" (degraded output quality) by:
1. **Separating concerns:** Research loads context, Plan uses it, Implement executes
2. **Human checkpoints:** Approval required between Plan and Implement
3. **Atomic changes:** Small, testable, reversible modifications
4. **Context discipline:** Each phase has a budget, compacts before next phase

### Token Budget Strategy

| Phase | Budget | Cumulative |
|-------|--------|------------|
| Research | 50K | 50K (25%) |
| Plan | 35K | 85K (42%) |
| Implement | 60K | 145K (72%) |
| Buffer | 55K | 200K (100%) |

### Workflow Diagram

```
User Request
     │
     ▼
┌─────────────────┐
│  /rpi-research  │ → .ai-context/research/active/[name]_research.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   /rpi-plan     │ → .ai-context/plans/active/[name]_plan.md
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ APPROVE │ ← Human Review
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ /rpi-implement  │ → Code changes + Doc updates
└────────┬────────┘
         │
         ▼
  .ai-context/plans/completed/[name]_plan.md
```

---

<details>
<summary><b>Research Phase (/rpi-research)</b></summary>

**Purpose:** Systematic, zero-code-modification exploration using parallel agents

**Process:**
1. Spawn 3-5 parallel Explore agents (API, Logic, DB, External, Tests)
2. Each agent produces a Research Chunk (CHUNK-R1, CHUNK-R2, etc.)
3. Aggregate chunks into unified research document
4. Generate 150-word summary

**Parallel Agent Strategy:**
```
Agent 1: API/Route Entry Points        → CHUNK-R1
Agent 2: Business Logic & Models       → CHUNK-R2
Agent 3: Database/Storage Layer        → CHUNK-R3
Agent 4: External Integrations         → CHUNK-R4
Agent 5: Test Coverage Analysis        → CHUNK-R5
```

**Exit Criteria:**
- [ ] Research document created with chunked structure
- [ ] 3-20 relevant files identified per chunk
- [ ] Call chains traced with line numbers
- [ ] Dependencies mapped per chunk
- [ ] Chunk manifest created for RPI-Plan

**Template Prompts for Research:**

```markdown
## Feature Research Template

I'm planning to implement [feature name]. Please research:

### Areas to Explore
1. **Entry Points**: Where does this feature connect to existing code?
2. **Business Logic**: What existing logic should I reference?
3. **Data Layer**: What database models/tables are involved?
4. **External Services**: Are there external API dependencies?
5. **Test Coverage**: What existing tests cover similar functionality?

### Expected Output
- Organized into 3-7 chunks by domain
- Each chunk has: files explored, call chains, dependencies
- Chunk manifest for planning phase
- 150-word executive summary

### Context to Reference
- Similar existing features
- Relevant workflow documentation
- Database schema if applicable
```

</details>

---

<details>
<summary><b>Plan Phase (/rpi-plan)</b></summary>

**Purpose:** Create detailed implementation blueprint using chunk-based todolists

**Process:**
1. Load research document with chunks
2. For each Research Chunk (CHUNK-Rn):
   - Create corresponding Plan Chunk (CHUNK-Pn)
   - Generate chunk-specific todolist
   - Mark research chunk as PLANNED
3. Define scope, test strategy, rollback plan
4. Request human approval

**Chunk Processing Loop:**
```
FOR each CHUNK-Rn in research_chunks:
  1. Read CHUNK-Rn content
  2. Create CHUNK-Pn todolist
  3. Mark CHUNK-Rn as PLANNED
  4. Link CHUNK-Pn dependencies
  5. Proceed to next CHUNK-R(n+1)
```

**Exit Criteria:**
- [ ] Plan document created with file:line references
- [ ] All research chunks marked as PLANNED
- [ ] Chunk-todolists created for each chunk
- [ ] Test strategy documented
- [ ] Human approval obtained

**Template Prompts for Planning:**

```markdown
## Implementation Plan Template

Based on the research for [feature name], create an implementation plan:

### Scope Definition
- **In Scope**: [list specific changes]
- **Out of Scope**: [explicitly state what's NOT included]

### Chunk-Based Todolists
For each research chunk, create:
- Atomic action items (one change per item)
- File:line references for each action
- Test to run after each action
- Chunk-specific rollback steps

### Testing Strategy
- Tests per chunk
- Integration tests after all chunks
- Edge cases to cover

### Rollback Plan
- Per-chunk rollback commands
- Safe commit boundaries

### Dependencies
- Which chunks must complete before others
- External prerequisites
```

</details>

---

<details>
<summary><b>Implement Phase (/rpi-implement)</b></summary>

**Purpose:** Execute approved plan chunk by chunk with atomic changes

**Golden Rule:**
```
ONE CHUNK → COMPLETE TODOLIST → MARK DONE → NEXT CHUNK
ONE TODO → ONE CHANGE → ONE TEST → ONE COMMIT
```

**Process:**
1. Load plan document with chunk-todolists
2. For each Plan Chunk (CHUNK-Pn):
   - Execute each todo atomically
   - Run test after each change
   - Commit if pass, stop if fail
   - Mark CHUNK-Pn as IMPLEMENTED
   - Update corresponding CHUNK-Rn
3. Run full test suite
4. Update documentation
5. Archive documents

**Chunk Implementation Loop:**
```
FOR each CHUNK-Pn in plan_chunks:
  FOR each TODO in CHUNK-Pn:
    a. Make atomic change
    b. Run specified test
    c. If PASS: commit, mark TODO complete
    d. If FAIL: stop, investigate, fix
  Mark CHUNK-Pn as IMPLEMENTED
  Update research CHUNK-Rn status
  Context reset if >35% utilization
```

**Exit Criteria:**
- [ ] All plan chunks marked as IMPLEMENTED
- [ ] All research chunks marked as COMPLETE
- [ ] All tests passing
- [ ] Documentation updated per chunk
- [ ] Changes committed
- [ ] Documents archived

**Template Prompts for Implementation:**

```markdown
## Implementation Execution Template

Execute the approved plan for [feature name]:

### Preconditions
- [ ] Plan approved
- [ ] Branch is clean
- [ ] Tests passing
- [ ] Chunk manifest loaded

### Execution Order
Follow chunk dependency order:
1. CHUNK-P1 (no dependencies)
2. CHUNK-P2 (depends on P1)
3. CHUNK-P3 (depends on P1)
...and so on

### Per-TODO Process
1. Make single atomic change
2. Run specified test
3. If PASS: commit with descriptive message
4. If FAIL: investigate before proceeding

### After All Chunks
- Run full test suite
- Update affected workflows
- Run /verify-docs-current
- Archive plan and research
```

</details>

---

<details>
<summary><b>Chunk Status Flow</b></summary>

```
RESEARCH CHUNKS                 PLAN CHUNKS
┌─────────────────┐            ┌─────────────────┐
│ CHUNK-R1        │            │ CHUNK-P1        │
│ Status: FOUND   │────────────│ Status: READY   │
│ → COMPLETE      │            │ → IMPLEMENTING  │
│ → PLANNED       │←───────────│ → IMPLEMENTED   │
│ → IMPLEMENTED   │←───────────│ → COMPLETE      │
└─────────────────┘            └─────────────────┘
```

**Status Transitions:**
- Research: `FOUND` → `COMPLETE` → `PLANNED` → `IMPLEMENTED`
- Plan: `DRAFT` → `READY` → `IMPLEMENTING` → `IMPLEMENTED` → `COMPLETE`

</details>

---

<details>
<summary><b>Error Recovery</b></summary>

| Error Type | Response |
|------------|----------|
| Syntax Error | STOP. Fix immediately in same session. |
| Import Error | Check file paths, verify imports. |
| Runtime Error | Create research subtask before fixing. |
| Test Failure | Do NOT add more code. Investigate first. |
| 3+ Failures | STOP. Compact context. Start new session. |
| Chunk Failure | Mark chunk as BLOCKED, proceed to independent chunks |

</details>

---

`★ Insight ─────────────────────────────────────`
**RPI is Inter-Phase Aware**: Each phase knows exactly how the next phase will consume its output. Research creates chunks specifically for Planning consumption. Plan creates todolists specifically for Implementation execution. This awareness eliminates miscommunication between phases and dramatically reduces errors.
`─────────────────────────────────────────────────`

</details>

---

<details>
<summary><b>💼 Part 5: Coding Session Workflows</b></summary>

<details>
<summary><b>Daily Development Workflow</b></summary>

```bash
# Morning - Start fresh
/session-resume --last           # Resume yesterday's session
k0ntext stats                    # Check database status

# During development - small changes
# Make changes...
k0ntext watch &                  # Auto-index on changes
# (do your work)
/verify-docs-current file.ts    # Verify docs after changes
/auto-sync --fix                 # Sync if needed

# End of day - save work
/session-save --checkpoint "End of day: feature X in progress"
```

</details>

---

<details>
<summary><b>Feature Development Workflow</b></summary>

```bash
# Step 1: Research
/rpi-research user-preferences-feature

# Review research chunks
cat .claude/research/active/user-preferences-feature_research.md

# Step 2: Plan
/rpi-plan user-preferences-feature

# Review and approve plan
cat .claude/plans/active/user-preferences-feature_plan.md

# Step 3: Implement
/rpi-implement user-preferences-feature

# Step 4: Validate
/validate-all

# Step 5: Commit and sync
git add .
git commit -m "feat: add user preferences feature"
k0ntext sync
```

</details>

---

<details>
<summary><b>Bug Fix Workflow</b></summary>

```bash
# Quick bug fix without full RPI
k0ntext index                    # Ensure database is current
k0ntext search "login error"     # Find relevant code

# Use semantic search to locate the bug
# Review found files...

# Make the fix
# (edit files)

# Verify documentation
/verify-docs-current src/auth/login.ts

# Run tests
npm test

# Update context
k0ntext generate
k0ntext sync
```

</details>

---

<details>
<summary><b>Code Review Workflow</b></summary>

```bash
# Before reviewing - understand the context
k0ntext search "PR topic"         # Find related code

# During review - verify accuracy
/verify-docs-current affected/files/*

# After requesting changes - help author
@core-architect "Suggest refactoring for [component]"

# When approving - validate all
/validate-all
```

</details>

---

<details>
<summary><b>Working with Multiple Agents</b></summary>

```bash
# Complex feature requiring multiple domains

# 1. Architecture first
@core-architect "Design payment processing system architecture"

# 2. Database design
@database-ops "Design schema for payment transactions"

# 3. API endpoints
@api-developer "Design payment API endpoints"

# 4. External integrations
@integration-hub "Design Stripe integration for payments"

# 5. Deployment
@deployment-ops "Design deployment pipeline for payment service"

# Then execute with RPI
/rpi-research payment-processing
/rpi-plan payment-processing
/rpi-implement payment-processing
```

</details>

---

<details>
<summary><b>Team Handoff Workflow</b></summary>

```bash
# End of your shift
/session-save --checkpoint "Handoff: authentication API in progress"
/collab handoff

# Start of next person's shift
/session-resume --list
/session-resume <checkpoint-id>

# Review handoff document
cat .claude/knowledge/sessions/latest-handoff.md
```

</details>

---

`★ Insight ─────────────────────────────────────`
**Workflow Selection Matters**: Not every task needs full RPI. Quick bug fixes can use direct search + edit. Feature development benefits from full RPI. Team handoffs require session management. Choose the workflow that matches your task complexity and context.
`─────────────────────────────────────────────────`

</details>

---

<details>
<summary><b>📚 Appendix</b></summary>

### CLI Commands Reference

| Command | Purpose |
|---------|---------|
| `k0ntext init` | Initialize with intelligent analysis |
| `k0ntext generate` | Generate context files for AI tools |
| `k0ntext mcp` | Start MCP server |
| `k0ntext sync` | Sync across AI tools |
| `k0ntext cleanup` | Remove conflicting AI tool folders |
| `k0ntext validate` | Validate context files |
| `k0ntext export` | Export database to file |
| `k0ntext import` | Import from exports |
| `k0ntext performance` | Show performance metrics |
| `k0ntext watch` | Auto-index file changes |
| `k0ntext index` | Index codebase into database |
| `k0ntext search <query>` | Search indexed content |
| `k0ntext stats` | View database statistics |
| `k0ntext check` | Check if context files outdated |
| `k0ntext restore` | Restore from backups |
| `k0ntext sync-templates` | Sync templates from package |
| `k0ntext template-status` | Show template sync status |
| `k0ntext drift-detect` | AI-powered drift detection |
| `k0ntext cross-sync` | Intelligent cross-tool sync |
| `k0ntext hooks` | Git hooks management |
| `k0ntext fact-check` | Validate documentation accuracy |
| `k0ntext snapshot` | Manage database snapshots |
| `k0ntext migrate` | Manage database migrations |

### Template Customization

Templates are synced from `templates/base/` to your `.claude/` directory. To customize:

1. **Edit local templates:**
   ```bash
   # Edit your local copy
   vim .claude/commands/my-command.md
   ```

2. **Prevent overwrites:**
   ```bash
   # Mark as user-only to prevent sync overwrites
   # Add to .claude/.local.md or use git to track changes
   ```

3. **Sync updated templates:**
   ```bash
   k0ntext sync-templates
   ```

4. **Check sync status:**
   ```bash
   k0ntext template-status
   ```

### Troubleshooting

**Problem:** Slash commands not found
**Solution:** Run `k0ntext init` to sync commands to `.claude/commands/`

**Problem:** Agents not responding
**Solution:** Check `.claude/agents/` directory exists and contains agent files

**Problem:** Research documents not found
**Solution:** Ensure `.claude/research/` and `.claude/plans/` directories exist

**Problem:** Context exceeds budget
**Solution:** Run `/context-optimize` to identify redundant content

**Problem:** Documentation out of sync
**Solution:** Run `/auto-sync --fix` or `k0ntext cross-sync`

### Getting More Help

- **Quick Start:** See [QUICKSTART.md](QUICKSTART.md)
- **MCP Guide:** See [MCP_QUICKSTART.md](MCP_QUICKSTART.md)
- **Troubleshooting:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub Issues:** [Report bugs](https://github.com/SireJeff/k0ntext/issues)

</details>

---

**Version:** 3.8.0
**Last Updated:** 2026-02-12
**Platform:** k0ntext Universal AI Context Engineering
