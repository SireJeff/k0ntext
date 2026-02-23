---
description: RPI Implement Phase - Execute manifest-based todolists with atomic changes
---

# Context Engineering: Implement Phase (Manifest-Driven)

When invoked, execute the approved implementation plan by processing the Plan Manifest:

## Key Innovation: Manifest-Driven Execution

This implement phase is **Manifest-Driven**:
1.  **Read Plan Manifest:** Load the output from RPI-Plan.
2.  **Sequential Execution:** Execute Plan Chunks in dependency order.
3.  **Status Updates:** Update status in both Plan and Research manifests.

## Process

1.  **Load Plan Manifest**
    -   Read `.claude/plans/active/[feature]_plan.md`.
    -   Extract the table of Plan Chunks (`CHUNK-Pn`).
    -   Verify dependencies are met.

2.  **Sequential Execution (Execution Loop)**
    -   **For each CHUNK-Pn in Manifest (in dependency order):**
        -   **Atomic Todos Loop:**
            -   1. Make atomic change (from plan details).
            -   2. Run specific test (from plan details).
            -   3. Commit (if pass).
        -   **Status Update:**
            -   Mark `CHUNK-Pn` as `IMPLEMENTED` in Plan Manifest.
            -   Mark linked `CHUNK-Rn` as `IMPLEMENTED` in Research Manifest (if applicable).
            -   Commit documentation updates.

3.  **Context Management**
    -   Reset context after every 3 chunks to maintain precision.

4.  **Finalize**
    -   Run full test suite.
    -   Archive documents.

## Manifest Status Updates (Required)

### Update Plan Manifest
```markdown
| Chunk ID | Research ID | Status | Todos | Dependencies | Ready |
|----------|-------------|--------|-------|--------------|-------|
| CHUNK-P1 | CHUNK-R1    | DONE   | 4     | None         | ✅    |
```

### Update Research Manifest (in Research Doc)
```markdown
| Chunk ID | Domain | Status | Files Found | Ready for Deep Dive |
|----------|--------|--------|-------------|---------------------|
| CHUNK-R1 | API    | IMPLEMENTED | 3 | ✅ |
```

## Golden Rule
```
READ MANIFEST -> SELECT CHUNK -> EXECUTE TODOS -> UPDATE STATUS -> NEXT CHUNK
```

## Context Budget
-   Plan: 15k tokens.
-   Active code: ~10k tokens.
-   Total: ~25k tokens active context.

## Next Step
After completion: `/context-eng:validate`
