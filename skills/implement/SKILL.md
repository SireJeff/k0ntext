---
name: rpi-implement
version: "3.0.0"
description: "RPI Implement Phase: Manifest-Driven Execution of Plan Chunks"
category: "rpi-orchestration"
rpi_phase: "implement"
context_budget_estimate: "60K tokens"
typical_context_usage: "30%"
chunk_input: true
loop_based: true
inter_phase_aware: true
prerequisites:
  - "Plan Manifest exists in .ai-context/plans/active/"
  - "Plan has been approved by human"
  - "Git branch is clean"
  - "All tests currently passing"
outputs:
  - "Implemented feature/fix (manifest-based)"
  - "Updated Plan Manifest (statuses to IMPLEMENTED)"
  - "Updated Research Manifest (statuses to IMPLEMENTED)"
  - "Archived documents"
next_commands: ["/verify-docs-current", "/validate-all"]
related_agents: ["core-architect", "database-ops", "api-developer", "deployment-ops"]
examples:
  - command: "/rpi-implement user-authentication"
    description: "Read Plan Manifest, execute chunks sequentially, update statuses"
exit_criteria:
  - "All Plan Chunks marked as IMPLEMENTED"
  - "All Research Chunks marked as IMPLEMENTED"
  - "All tests passing"
  - "Documentation updated"
  - "Documents archived"
---

# RPI Implement Phase (Manifest-Driven Execution)

**Purpose:** Execute the Plan Manifest chunk-by-chunk with atomic precision.

**Syntax:** `/rpi-implement [feature-name]`

---

## Key Innovation: Manifest-Driven Execution

1.  **Read Plan Manifest:** Load the approved plan structure.
2.  **Sequential Execution:** Follow dependency order defined in the manifest.
3.  **Bidirectional Status Updates:** Update both Plan and Research documents as work completes.

---

## Execution Steps

### Step 1: Load Plan Manifest
Read `.ai-context/plans/active/[feature]_plan.md`.

### Step 2: Sequential Execution Loop
**For each ready CHUNK-Pn in Manifest:**
-   **Execute Todos:**
    -   1. Make atomic change.
    -   2. Run specific test.
    -   3. Commit (if pass).
-   **Update Status:**
    -   Mark `CHUNK-Pn` as `IMPLEMENTED` in Plan.
    -   Mark linked `CHUNK-Rn` as `IMPLEMENTED` in Research.

### Step 3: Context Management
Reset context after every 3 chunks.

### Step 4: Finalize
Run full test suite. Update documentation.

---

## Output Format (Manifest Updates)

**Plan Manifest:**
```markdown
| Chunk ID | Research ID | Status | Todos | Dependencies |
|----------|-------------|--------|-------|--------------|
| CHUNK-P1 | CHUNK-R1    | DONE   | 4     | None         |
```

**Research Manifest:**
```markdown
| Chunk ID | Domain | Status | Files Found | Ready for Deep Dive |
|----------|--------|--------|-------------|---------------------|
| CHUNK-R1 | API    | IMPLEMENTED | 3 | ✅ |
```

---

## Context Budget
-   Active code: ~10k tokens.
-   Test results: ~5k tokens.
-   Total active: ~25k tokens.

---

## Next Step
After completion: `/context-eng:validate`
