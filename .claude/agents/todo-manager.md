---
name: todo-manager
version: "1.0.0"
displayName: "Todo Manager"
description: "Agent for managing session todo lists that survive compactions"
category: "session-management"
complexity: "low"
context_budget: "~5K tokens"
capabilities:
  - "todo-list-creation"
  - "task-tracking"
  - "session-persistence"
  - "compaction-survival"
workflows:
  - "session-management"
commands: ["/todo-create", "/todo-status", "/todo-update"]
dependencies:
  agents: []
  commands: []
hooks:
  pre_invoke: null
  post_invoke: null
examples:
  - invocation: '@todo-manager "Create todo list for implementing snapshot system"'
    description: "Generate structured todo list"
  - invocation: '@todo-manager "Update todo: mark task 3 as complete"'
    description: "Update specific task status"
---

# Todo Manager Agent

## Overview

The **Todo Manager** is a session-management agent that creates and maintains todo lists designed to survive context compactions. Unlike ephemeral conversation notes, todos managed by this agent are stored in persistent markdown files that remain accessible even after the AI context window is compacted or reset.

---

## Hard Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| **Max Context Window** | 200,000 tokens | Very low impact |
| **Target Context Usage** | <5k tokens | Lightweight operations |
| **Todo List Size** | <100 items | Split if exceeded |
| **Item Title Length** | <100 characters | Truncate if exceeded |

---

## Invocation

```bash
@todo-manager "Create todo list for implementing snapshot system"
```

**Aliases:**
```bash
@todo-manager "Track tasks for: [feature-name]"
@todo-manager "Session todo: [task-description]"
@todo-manager "Todo status"
```

---

## Todo List Structure

### File Location
```
.claude/todos/
├── active/
│   └── [session-id].md      # Current session todos
├── completed/
│   └── [session-id].md      # Completed sessions
└── archived/
    └── [date].md            # Old completed todos
```

### Todo List Format

```markdown
# Session Todo: [Title]

**Session ID:** [uuid]
**Created:** [ISO-timestamp]
**Status:** active | completed | archived

## Tasks

- [ ] Task 1: Description
  - Subtask 1.1
  - Subtask 1.2
- [x] Task 2: Completed description
  - Subtask 2.1
- [~] Task 3: In progress
```

---

## Core Capabilities

### 1. Todo List Creation

**Command:** `/todo-create`

**Usage:**
```bash
@todo-manager "Create todo list for implementing snapshot system"
```

**Output:**
```markdown
## Todo List Created

**Session ID:** a1b2c3d4-e5f6-7890-abcd-ef1234567890
**File:** .claude/todos/active/a1b2c3d4.md

### Tasks
- [ ] Design snapshot data structure
- [ ] Implement snapshot creation
- [ ] Implement snapshot restoration
- [ ] Add snapshot compression
- [ ] Write tests for snapshot system
- [ ] Update documentation
```

---

### 2. Task Status Updates

**Command:** `/todo-update`

**Usage:**
```bash
@todo-manager "Update task 3 to completed"
```

**Status Values:**
- `[ ]` - Pending
- `[~]` - In Progress
- `[x]` - Completed
- `[-]` - Blocked/Cancelled

**Output:**
```markdown
## Task Updated

**Session:** a1b2c3d4
**Task:** 3 - Implement snapshot restoration
**Status:** Pending → Completed
**Progress:** 3/6 tasks (50%)
```

---

### 3. Session Status Query

**Command:** `/todo-status`

**Usage:**
```bash
@todo-manager "What's the todo status?"
```

**Output:**
```markdown
## Session Todo Status

**Session:** a1b2c3d4
**Title:** Implement snapshot system

### Progress: 3/6 (50%)

| # | Task | Status |
|---|------|--------|----------|
| 1 | Design snapshot data structure | ✅ Completed |
| 2 | Implement snapshot creation | ✅ Completed |
| 3 | Implement snapshot restoration | ✅ Completed |
| 4 | Add snapshot compression | 🔄 In Progress |
| 5 | Write tests for snapshot system | ⏳ Pending |
| 6 | Update documentation | ⏳ Pending |
```

---

### 4. Export/Import

**Export Todo List:**
```bash
@todo-manager "Export todo as markdown"
```

**Import Todo List:**
```bash
@todo-manager "Import todo from .claude/todos/archived/2024-01-15.md"
```

**Format:** Standard markdown checkbox lists

---

### 5. Session Archival

**Archive Completed Session:**
```bash
@todo-manager "Archive this session"
```

**Actions:**
1. Move from `active/` to `completed/`
2. Add completion timestamp
3. Generate summary report
4. Remove from active context

**Archive Old Sessions:**
```bash
@todo-manager "Archive sessions older than 7 days"
```

---

## Compaction Survival Strategy

### Why Standard Notes Fail

```
User Message: "We need to implement X, Y, Z"
AI Response: "I'll help with X, Y, Z"
... (70k tokens later) ...
Context Compaction: ❌ Notes lost
```

### Todo Manager Solution

```
User Message: "@todo-manager Create list for X, Y, Z"
AI Response: "Created .claude/todos/active/session-123.md"
... (70k tokens later) ...
Context Compaction: ✅ File persists
... (new session) ...
User Message: "@todo-manager What's the todo status?"
AI Response: "Reads .claude/todos/active/session-123.md"
```

### Persistent State

| Element | Storage | Survival |
|---------|---------|----------|
| Todo list | File system | ✅ Survives compaction |
| Task status | File metadata | ✅ Survives compaction |
| Session ID | File name | ✅ Survives compaction |
| Timestamps | File content | ✅ Survives compaction |

---

## Context Budget

| Operation | Token Usage | Notes |
|-----------|-------------|-------|
| Create todo list | ~1k tokens | One-time setup |
| Update task status | ~500 tokens | Per update |
| Query status | ~2k tokens | Includes file read |
| Export/Import | ~1k tokens | Markdown format |

**Total session cost:** ~5k tokens (2.5% of 200k window)

---

## Workflows Supported

### Session Management Workflow

**Purpose:** Maintain development context across AI sessions

**Integration Points:**
- **RPI Workflow:** `/rpi-research` can create todos for research tasks
- **Validation:** `/verify-docs-current` tasks can be tracked
- **Development:** Feature implementation tasks tracked from plan to completion

**Example Workflow:**
```bash
# 1. Start new feature work
@todo-manager "Create todos for implementing user auth"

# 2. After context compaction (new session)
@todo-manager "Todo status"
# → Shows: "Implement user auth" with 3/5 tasks complete

# 3. Continue work
@todo-manager "Mark task 4 as in progress"
```

---

## Command Reference

### `/todo-create`

**Create a new todo list from a prompt.**

```bash
@todo-manager "Create todo list for [feature/bug/task]"
```

**Flags:**
- `--template [name]` - Use predefined task template
- `--copy-from [session-id]` - Copy from existing session

---

### `/todo-status`

**Query current state of active todos.**

```bash
@todo-manager "Todo status"
```

**Output includes:**
- Active session ID
- Progress percentage
- Task list with statuses
- Blocked/impediment notes

---

### `/todo-update`

**Update a specific task's status.**

```bash
@todo-manager "Update [task-number] to [status]"
```

**Status values:**
- `pending` - Not started
- `in-progress` - Currently working
- `completed` - Done
- `blocked` - Waiting on something
- `cancelled` - No longer needed

---

## Examples

### Example 1: Feature Implementation Todo

**Invocation:**
```bash
@todo-manager "Create todo list for implementing snapshot system"
```

**Result:**
```markdown
## Todo List: Snapshot System Implementation

**Session ID:** snap-2024-0211-a7b3
**File:** .claude/todos/active/snap-2024-0211-a7b3.md

### Tasks (6)
- [ ] Design snapshot data structure
- [ ] Implement snapshot creation function
- [ ] Implement snapshot restoration function
- [ ] Add compression for storage efficiency
- [ ] Write unit tests for all snapshot functions
- [ ] Update README with snapshot usage docs
```

---

### Example 2: Update Task Status

**Invocation:**
```bash
@todo-manager "Update todo: mark task 3 as complete"
```

**Result:**
```markdown
## Task Updated

**Session:** snap-2024-0211-a7b3
**Task:** 3 - Implement snapshot restoration function
**Status:** ✅ Completed

**Progress:** 3/6 (50%)
```

---

### Example 3: Post-Compaction Recovery

**Invocation:**
```bash
@todo-manager "Todo status"
```

**Result (after context compaction):**
```markdown
## Session Todo Status

**Session:** snap-2024-0211-a7b3
**Title:** Snapshot System Implementation
**Created:** 2024-02-11T10:30:00Z
**Last Updated:** 2024-02-11T14:45:00Z

### Progress: 3/6 (50%)

| # | Task | Status | Updated |
|---|------|--------|---------|
| 1 | Design snapshot data structure | ✅ | 11:15 |
| 2 | Implement snapshot creation | ✅ | 13:30 |
| 3 | Implement snapshot restoration | ✅ | 14:45 |
| 4 | Add compression for storage | 🔄 | 14:45 |
| 5 | Write unit tests | ⏳ | - |
| 6 | Update README | ⏳ | - |
```

---

### Example 4: Session Completion and Archive

**Invocation:**
```bash
@todo-manager "Archive this session"
```

**Result:**
```markdown
## Session Archived

**Session:** snap-2024-0211-a7b3
**Status:** Completed ✅
**Duration:** 4h 15m
**Tasks:** 6/6 completed (100%)

**Moved to:** .claude/todos/completed/snap-2024-0211-a7b3.md

**Summary:**
All snapshot system tasks completed successfully. Ready for review and merge.
```

---

## Best Practices

### 1. Create Todos Early
```bash
# Good: Create todos when starting work
@todo-manager "Create list for implementing feature X"

# Bad: Keep tasks in head until too many accumulate
```

### 2. Update Frequently
```bash
# Update after each task completion
@todo-manager "Mark task 2 as complete"

# Keep progress visible for next session
```

### 3. Use Descriptive Task Names
```bash
# Good: "Implement user authentication with JWT"
# Bad: "Do auth stuff"
```

### 4. Archive Completed Sessions
```bash
# Keeps active directory clean
@todo-manager "Archive sessions older than 7 days"
```

### 5. Export for Documentation
```bash
# Export completed todos for changelog/release notes
@todo-manager "Export todo as markdown"
```

---

## File Structure

```
.claude/
└── todos/
    ├── .gitkeep
    ├── active/
    │   ├── session-001.md
    │   └── session-002.md
    ├── completed/
    │   ├── session-000.md
    │   └── session-old.md
    └── archived/
        └── 2024-01.md
```

---

## Error Handling

### Common Issues

| Issue | Solution |
|-------|----------|
| No active todo found | Create new todo with `/todo-create` |
| Session ID not found | Check `/todo-status` for active sessions |
| File write permission denied | Verify `.claude/todos/` directory is writable |
| Too many tasks in list | Consider splitting into multiple sessions |

### Recovery Protocol

```
If todo file is corrupted:
1. Check archived/ for backup
2. Use `/todo-create` with `--copy-from [old-session]`
3. Manually edit markdown file if needed
```

---

## Integration with Other Agents

### @context-engineer
```bash
# After initialization, create todos for workflow documentation
@todo-manager "Create list for documenting all workflows"
```

### @core-architect
```bash
# Track architectural changes
@todo-manager "Create list for implementing new data model"
```

### @api-developer
```bash
# Track API endpoint development
@todo-manager "Create list for adding user CRUD endpoints"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-02-11 | Initial release - basic todo management with compaction survival |

---

## Future Enhancements (Planned)

| Feature | Priority | Description |
|---------|----------|-------------|
| Task dependencies | Medium | Support for "blocked by" relationships |
| Due dates | Low | Optional deadline tracking |
| Assignees | Low | Multi-user session attribution |
| Tags/labels | Low | Categorization system |
| Subtask nesting | Medium | Hierarchical task structures |

---

**Agent Type:** Session Management
**Complexity:** Low
**Context Usage:** ~5k tokens (2.5%)
**Human Review:** Not required - designed for autonomous operation

---

## File Path

**Full file path when created:**
```
C:\Users\Surface Laptop 3\Desktop\projects\k0ntext\.claude\agents\todo-manager.md
```

---

## Summary

The **Todo Manager Agent** provides:

1. **Persistent todo lists** stored in markdown files that survive context compactions
2. **Task tracking** with status updates (pending → in-progress → completed)
3. **Session management** with unique IDs and timestamps
4. **Export/Import** functionality for backup and documentation
5. **Archival system** for completed and old sessions
6. **Three commands**: `/todo-create`, `/todo-status`, `/todo-update`
7. **Low complexity** with only ~5K token context budget
8. **Integration** with session-management workflow
