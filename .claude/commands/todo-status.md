---
name: todo-status
version: "1.0.0"
displayName: "Todo Status"
description: "Show current session todo list with task statuses"
category: "session-management"
arguments:
  - name: "--session <name>"
    description: "Show specific session todo"
    required: false
  - name: "--format <type>"
    description: "Output format (table|json|markdown)"
    required: false
examples:
  - invocation: '/todo-status'
    description: "Show current session todos"
---

# Todo Status Command

## Overview

The **todo-status** command displays the current session's todo list with task statuses. This command helps you track progress on tasks and maintain awareness of what needs to be completed during a development session. It supports multiple output formats for different use cases and can filter by specific session names.

---

## Usage

### Basic Syntax

```bash
/todo-status [--session <name>] [--format <type>]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--session <name>` | string | No | Show todo list for a specific session by name |
| `--format <type>` | string | No | Output format: `table` (default), `json`, or `markdown` |

---

## Examples

### Show Current Session Todos

```bash
/todo-status
```

Output example (table format):
```
+----+---------------------+---------+------------------+
| ID | Task                | Status  | Priority         |
+----+---------------------+---------+------------------+
| 1  | Implement auth flow | pending | high             |
| 2  | Write tests         | pending | medium           |
| 3  | Update docs         | done    | low              |
+----+---------------------+---------+------------------+
```

### Show Specific Session Todos

```bash
/todo-status --session "auth-refactor"
```

### Output as JSON

```bash
/todo-status --format json
```

Output example:
```json
{
  "session": "default",
  "tasks": [
    {
      "id": "1",
      "description": "Implement auth flow",
      "status": "pending",
      "priority": "high"
    },
    {
      "id": "2",
      "description": "Write tests",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

### Output as Markdown

```bash
/todo-status --format markdown
```

Output example:
```markdown
# Session Todos: default

| Task | Status | Priority |
|------|--------|----------|
| Implement auth flow | pending | high |
| Write tests | pending | medium |
| Update docs | done | low |
```

---

## Notes

### Task Statuses

The following statuses are recognized by the todo-status command:

- **pending** - Task not yet started
- **in-progress** - Task currently being worked on
- **done** - Task completed
- **blocked** - Task blocked by dependency
- **cancelled** - Task cancelled and no longer relevant

### Format Options

| Format | Description | Best For |
|--------|-------------|----------|
| `table` | ASCII table format | Terminal display |
| `json` | Structured JSON data | Parsing by scripts/tools |
| `markdown` | Markdown table format | Documentation |
| `compact` | Single-line summary | Quick status checks |

### Session Management

- Default session is used if `--session` is not specified
- Session names are case-sensitive
- Active session is stored in `.claude/session/state.json`

---

## Related Commands

- `/todo-add` - Add a new task to the todo list
- `/todo-remove` - Remove a task from the todo list
- `/todo-update` - Update task status or description
- `/session-list` - List all available sessions

---

## k0ntext CLI Integration

This command integrates with k0ntext's session management features. When working on codebase tasks:

```bash
# Query current status before starting work
/todo-status

# After completing a task
/todo-complete 1
```

---

**Command Type:** Session Management
**Category:** session-management
**Version:** 1.0.0
