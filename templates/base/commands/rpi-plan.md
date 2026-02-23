---
description: RPI Plan Phase - Create chunk-based implementation blueprint from Research Manifest
---

# Context Engineering: Plan Phase (Manifest-Driven)

When invoked, create a detailed implementation plan by processing the Research Manifest:

## Key Innovation: Manifest-Driven Planning

This plan phase is **Manifest-Driven**:
1.  **Read Research Manifest:** Load the output from RPI-Research.
2.  **Sequential Planning:** For each Research Chunk, spawn a sub-agent to generate a Plan Chunk.
3.  **Create Plan Manifest:** Aggregate Plan Chunks into a master table for RPI-Implement.

## Process

1.  **Load Research Manifest**
    -   Read `.claude/research/active/[feature]_research.md`.
    -   Extract the table of Research Chunks (`CHUNK-Rn`).

2.  **Sequential Planning (Sub-Agents Loop)**
    -   **For each CHUNK-Rn in Research Manifest:**
        -   Spawn a sub-agent to analyze the research details.
        -   Create a corresponding **Plan Chunk (CHUNK-Pn)**.
        -   Define atomic todolist (Change -> Test -> Commit).
        -   Specify precise file paths and line numbers.
        -   Mark Research Chunk as `PLANNED`.

3.  **Create Plan Manifest**
    -   Aggregate all Plan Chunks into a master table:
        ```markdown
        | Chunk ID | Research ID | Status | Todos | Dependencies | Ready |
        |----------|-------------|--------|-------|--------------|-------|
        | CHUNK-P1 | CHUNK-R1    | READY  | 4     | None         | ✅    |
        | CHUNK-P2 | CHUNK-R2    | DRAFT  | -     | CHUNK-P1     | ⏳    |
        ```

4.  **Generate Inter-Phase Contract**
    -   Format output for `rpi-implement`.

## Plan Manifest Format (Required)

```markdown
| Chunk ID | Research ID | Status | Todos | Dependencies | Ready |
|----------|-------------|--------|-------|--------------|-------|
| CHUNK-P1 | CHUNK-R1 | READY | 4 | None | ✅ |
...
```

## Detailed Plan Chunk Format

```markdown
## CHUNK-P1: [Domain] (from CHUNK-R1)

**Status:** READY
**Dependencies:** None

### Todolist
| # | Action | File | Lines | Risk | Test | Status |
|---|--------|------|-------|------|------|--------|
| 1 | [Action] | file.ext | 10-15 | LOW | test_x | ⏳ |

### Todo 1: [Action Name]
**File:** path/to/file.ext
**Lines:** 10-15
**Current:** [code]
**Proposed:** [code]
**Test:** [command]
```

## Context Budget
-   Research doc: 20k tokens.
-   Plan creation: 15k tokens.
-   Total: 35k tokens.

## Next Step
After approval, run `/context-eng:implement `

RPI-Implement will read the **Plan Manifest** to execute chunks.
