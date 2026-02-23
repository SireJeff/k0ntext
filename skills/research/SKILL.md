---
name: rpi-research
version: "3.0.0"
description: "RPI Research Phase: Manifest-Driven Parallel Execution with 5 Search Agents"
category: "rpi-orchestration"
rpi_phase: "research"
context_budget_estimate: "50K tokens"
typical_context_usage: "25%"
parallel_agents: "5"
chunk_output: true
inter_phase_aware: true
prerequisites: []
outputs:
  - "Research Manifest (5 chunks: API, Logic, DB, External, Tests)"
  - "Research document in .ai-context/research/active/[name]_research.md"
  - "Detailed file inventory with line references per chunk"
  - "Inter-phase contract for rpi-plan"
next_commands: ["/rpi-plan"]
related_agents: ["context-engineer", "core-architect"]
examples:
  - command: "/rpi-research user-authentication"
    description: "Launch 5 parallel agents to map auth flow, create manifest, then deep-dive sequentially"
exit_criteria:
  - "Research Manifest created with 5 domains"
  - "All chunks marked as COMPLETE"
  - "Deep-dive details appended per chunk"
  - "Inter-phase contract documented"
---

# RPI Research Phase (Manifest-Driven Parallel Execution)

**Purpose:** Systematic codebase exploration using **5 parallel agents** to create a Research Manifest, followed by sequential deep-dives.

**Syntax:** `/rpi-research [feature-name]`

---

## Key Innovation: Manifest-Driven Parallel Execution

1.  **Parallel Search:** 5 agents simultaneously search their domains.
2.  **Manifest Creation:** Results are aggregated into a table.
3.  **Sequential Deep Dive:** Sub-agents iterate through the manifest to populate details.

---

## Parallel Agent Strategy (Step 1)

Spawn 5 parallel search agents:

1.  **API/Routes:** Entry points, controllers.
2.  **Business Logic:** Models, services, algorithms.
3.  **Database:** Schemas, migrations, queries.
4.  **External:** API integrations, libraries.
5.  **Tests:** Existing tests, coverage gaps.

---

## Execution Steps

### Step 1: Initialize
Create `.ai-context/research/active/[feature]_research.md`.

### Step 2: Spawn 5 Parallel Agents
Dispatch agents to search their respective domains.

### Step 3: Create Research Manifest
Aggregate findings:
```markdown
| Chunk ID | Domain | Status | Files Found | Ready for Deep Dive |
|----------|--------|--------|-------------|---------------------|
| CHUNK-R1 | API    | FOUND  | 3           | ✅                  |
```

### Step 4: Sequential Deep Dive (Sub-Agents)
**For each item in the Manifest:**
-   Start a sub-agent to explore files in depth (File:Line).
-   Trace call chains.
-   Mark status as `COMPLETE` in manifest.

### Step 5: Finalize Output
Ensure format matches `rpi-plan` expectations.

---

## Output Format (Manifest)

```markdown
| Chunk ID | Domain | Status | Files | Ready for Planning |
|----------|--------|--------|-------|-------------------|
| CHUNK-R1 | API/Routes | COMPLETE | 3 | ✅ |
...
```

---

## Context Budget
-   Target: 25% of 200k (50k tokens).
-   Per-agent: ~10k tokens.
-   Compaction: After each sub-agent returns.

---

## Next Step
After completion: `/rpi-plan [feature-name]`
