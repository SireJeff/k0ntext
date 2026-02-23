---
description: RPI Research Phase - Systematic codebase exploration with parallel agents and chunked output
---

# Context Engineering: Research Phase (Manifest-Driven)

When invoked, perform systematic codebase exploration using **5 parallel agents** and create a structured manifest:

## Key Innovation: Manifest-Driven Parallel Execution

This research phase is **Manifest-Driven**:
1.  **Parallel Search:** 5 agents simultaneously search their domains.
2.  **Manifest Creation:** Results are aggregated into a table (Manifest).
3.  **Sequential Deep Dive:** Sub-agents iterate through the manifest to populate details.

## Process

1.  **Initialize Research Document**
    -   Create `.claude/research/active/[feature]_research.md`
    -   Use template from `.claude/research/RESEARCH_TEMPLATE.md`

2.  **Spawn 5 Parallel Search Agents**
    -   **Agent 1 (API/Routes):** Search for endpoints, controllers, route definitions.
    -   **Agent 2 (Business Logic):** Search for models, services, core algorithms.
    -   **Agent 3 (Database):** Search for schemas, migrations, queries.
    -   **Agent 4 (External):** Search for API integrations, third-party libs.
    -   **Agent 5 (Tests):** Search for existing tests and coverage gaps.

3.  **Create Research Manifest**
    -   Aggregate parallel results into a master table:
        ```markdown
        | Chunk ID | Domain | Status | Files Found | Ready for Deep Dive |
        |----------|--------|--------|-------------|---------------------|
        | CHUNK-R1 | API    | FOUND  | 3           | ✅                  |
        | ...      | ...    | ...    | ...         | ...                 |
        ```

4.  **Sequential Deep Dive (Sub-Agents Loop)**
    -   **For each CHUNK-Rn in Manifest:**
        -   Start a sub-agent to "explore and append" deep details.
        -   Trace call chains (File:Line).
        -   Identify dependencies.
        -   Mark status as `COMPLETE` in manifest.

5.  **Generate Inter-Phase Contract**
    -   Format output for `rpi-plan`.

## Research Manifest Format (Required)

```markdown
| Chunk ID | Domain | Status | Files | Ready for Planning |
|----------|--------|--------|-------|-------------------|
| CHUNK-R1 | API/Routes | COMPLETE | 3 | ✅ |
| CHUNK-R2 | Business Logic | COMPLETE | 4 | ✅ |
| CHUNK-R3 | Database | COMPLETE | 2 | ✅ |
| CHUNK-R4 | External | COMPLETE | 1 | ✅ |
| CHUNK-R5 | Tests | COMPLETE | 3 | ✅ |
```

## Context Budget
-   Target: 25% of 200k tokens (50k)
-   Per-agent budget: ~10k tokens each
-   Compaction: After each sub-agent returns

## Output
Research document saved to `.claude/research/active/` with:
-   Research Manifest
-   Detailed Sections per Chunk
-   Inter-phase contract for RPI-Plan

## Next Step
After completion, run `/context-eng:plan `

RPI-Plan will read the **Research Manifest** to generate its planning chunks.
