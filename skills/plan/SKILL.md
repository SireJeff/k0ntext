---
name: rpi-plan
version: "3.0.0"
description: "RPI Plan Phase: Manifest-Driven Implementation Planning from Research Manifest"
category: "rpi-orchestration"
rpi_phase: "plan"
context_budget_estimate: "35K tokens"
typical_context_usage: "17%"
chunk_input: true
chunk_output: true
inter_phase_aware: true
prerequisites:
  - "Research Manifest exists in .ai-context/research/active/"
  - "/rpi-research phase completed"
outputs:
  - "Plan Manifest (linked to Research Chunks)"
  - "Plan document in .ai-context/plans/active/[name]_plan.md"
  - "Chunk-based todolists with atomic actions"
  - "Inter-phase contract for rpi-implement"
next_commands: ["/rpi-implement"]
related_agents: ["core-architect", "database-ops", "api-developer"]
examples:
  - command: "/rpi-plan user-authentication"
    description: "Read Research Manifest, spawn sub-agents to create Plan Chunks"
exit_criteria:
  - "Plan Manifest created linking all Research Chunks"
  - "Detailed todolists for each Plan Chunk"
  - "Research Chunks marked as PLANNED"
  - "Human approval obtained"
---

# RPI Plan Phase (Manifest-Driven Planning)

**Purpose:** Transform the Research Manifest into an actionable Plan Manifest with atomic todolists.

**Syntax:** `/rpi-plan [feature-name]`

---

## Key Innovation: Manifest-Driven Execution

1.  **Read Research Manifest:** Load the output from RPI-Research.
2.  **Sequential Planning:** Spawn sub-agents to process each Research Chunk.
3.  **Create Plan Manifest:** Output the structured plan for RPI-Implement.

---

## Execution Steps

### Step 1: Load Research Manifest
Read `.ai-context/research/active/[feature]_research.md`.

### Step 2: Create Plan Manifest
Aggregate Plan Chunks:
```markdown
| Chunk ID | Research ID | Status | Todos | Dependencies | Ready |
|----------|-------------|--------|-------|--------------|-------|
| CHUNK-P1 | CHUNK-R1    | READY  | 4     | None         | ✅    |
```

### Step 3: Sequential Planning (Sub-Agents)
**For each CHUNK-Rn in Research Manifest:**
-   Spawn a sub-agent to analyze details.
-   Create a corresponding **Plan Chunk (CHUNK-Pn)**.
-   Define atomic todos (Change -> Test -> Commit).
-   Mark Research Chunk as `PLANNED`.

### Step 4: Finalize Output
Ensure format matches `rpi-implement` expectations.

---

## Output Format (Manifest)

```markdown
| Chunk ID | Research ID | Status | Todos | Dependencies | Ready |
|----------|-------------|--------|-------|--------------|-------|
| CHUNK-P1 | CHUNK-R1 | READY | 4 | None | ✅ |
...
```

## Detailed Output (Chunk)

```markdown
## CHUNK-P1: [Domain]
### Todolist
| # | Action | File | Lines | Risk | Test | Status |
|---|--------|------|-------|------|------|--------|
| 1 | [Action] | file.ext | 10-15 | LOW | test_x | ⏳ |
```

---

## Context Budget
-   Research doc: 20k tokens.
-   Plan creation: 15k tokens.
-   Total: 35k tokens.

---

## Next Step
After approval: `/rpi-implement [feature-name]`
