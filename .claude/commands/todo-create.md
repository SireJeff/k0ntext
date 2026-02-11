---
name: todo-create
version: "1.0.0"
displayName: "Todo Create"
description: "Create a new todo list for current session with optional tasks"
category: "session-management"
arguments:
  - name: "tasks"
    description: "Optional comma-separated task descriptions"
    required: false
  - name: "--session <name>"
    description: "Session name for grouping"
    required: false
examples:
  - invocation: '/todo-create "Review PR #123"'
    description: "Create todo list for PR review"
  - invocation: '/todo-create "Refactor context system" --session v3.8.0'
    description: "Create named session todo list"
---

# Todo Create Command

## Overview

The `/todo-create` command initializes a new todo list to track tasks for the current development session. This is useful for organizing work items, tracking progress, and maintaining focus during complex tasks that span multiple interactions.

## Usage

### Basic Syntax

```bash
/todo-create [tasks] [--session <name>]
```

### Arguments

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasks` | string | No | Comma-separated task descriptions to add to the new todo list |
| `--session <name>` | flag | No | Session name for grouping related todo lists |

## Examples

### Create an empty todo list

```bash
/todo-create
```

Creates a new, empty todo list for the current session.

### Create a todo list with initial tasks

```bash
/todo-create "Review PR #123, Verify unit tests, Update documentation"
```

Creates a new todo list with three initial tasks.

### Create a named session todo list

```bash
/todo-create "Refactor context system" --session v3.8.0
```

Creates a todo list associated with "v3.8.0" session.

## Notes

### Session Management Behavior

- **Session grouping:** The `--session` flag allows you to group multiple todo lists under a common session name, useful for tracking progress on version-specific work or feature branches
- **Current session:** If no `--session` is specified, the todo list is associated with the current active session
- **Session isolation:** Todo lists from different sessions are kept separate, preventing task clutter when switching between unrelated work items

### Task Formatting

- Tasks can be provided as a comma-separated list
- Each task description will be added as an uncompleted item
- Tasks can be marked complete using `/todo-complete` (if available)
- Existing todo lists can be viewed using `/todo-list` (if available)

### Persistence

- Todo lists are stored in session state
- Todo lists persist across Claude Code conversations within the same session
- Named sessions can be resumed later to access associated todo lists

---

## Related Commands

| Command | Description |
|---------|-------------|
| `/todo-list` | View current todo items (if available) |
| `/todo-complete <id>` | Mark a todo item as complete (if available) |
| `/todo-clear` | Clear all todo items (if available) |
| `/session-save` | Save current session including todo list |

## k0ntext CLI Integration

This command integrates with k0ntext's session management features. When working on codebase tasks:

```bash
# Before starting complex work
/todo-create "Research authentication flow, Design new schema, Implement endpoints" --session auth-refactor

# After completing items
/todo-complete 1

# When switching contexts
/session-save
```
