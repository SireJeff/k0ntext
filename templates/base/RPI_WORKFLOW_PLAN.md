# RPI (Research, Plan, Implement) Workflow

**Created:** {{DATE}}
**Platform:** Claude Code / AI Agents
**Context Budget:** 200k tokens max, target <40%
**Output Budget:** 30k tokens max per response

---

## Executive Summary

The RPI workflow prevents the "slop" and "dumb zone" problems in AI-assisted development. By separating research, planning, and implementation into distinct phases, we achieve:

- **90% fewer cascading errors**
- **3× faster feature implementation**
- **5× faster issue resolution**
- **Self-documenting changes**

**Key Innovation: Parallel Agents with Manifest-Driven Execution**

Each RPI phase utilizes parallel agents and produces **manifest-based outputs** designed for consumption by the next phase. This creates a self-aware pipeline where:
- **RPI-Research** spawns 5 parallel agents to create a **Research Manifest**, then sequentially deep-dives into each chunk.
- **RPI-Plan** reads the Research Manifest to create a **Plan Manifest** with specific todolists.
- **RPI-Implement** executes the Plan Manifest atomically, updating statuses across documents.

---

## Phase 1: RESEARCH

### Purpose
Understand the system, locate relevant components, prevent context pollution using parallel domain experts.

### Artifacts
- Research document in `.ai-context/research/active/[feature]_research.md`
- **Research Manifest** (Table of chunks with status)
- **Detailed Research Chunks** (One per manifest item)
- Inter-phase contract for RPI-Plan

### Process
1. **Initialize Research Document**
   - Create document from template.
2. **Spawn 5 Parallel Search Agents**
   - **Agent 1 (API/Routes):** Locate entry points, controllers, routes.
   - **Agent 2 (Business Logic):** Analyze models, services, core logic.
   - **Agent 3 (Database/Storage):** Map schemas, migrations, queries.
   - **Agent 4 (External Integrations):** Identify third-party APIs, webhooks.
   - **Agent 5 (Tests):** Assess current coverage, required tests.
3. **Create Research Manifest**
   - Aggregate initial findings into a master table:
     `| Chunk ID | Domain | Status | Files | Ready for Deep Dive |`
4. **Sequential Deep Dive (Sub-Agents)**
   - **For each item in the Manifest:**
     - Start a sub-agent to "explore and append" deep details.
     - Trace call chains, verify dependencies.
     - Mark chunk as `COMPLETE` in manifest.
5. **Finalize Output**
   - Ensure format matches RPI-Plan's expected input.

### Research Manifest Format
```markdown
| Chunk ID | Domain | Status | Files | Ready for Planning |
|----------|--------|--------|-------|-------------------|
| CHUNK-R1 | API/Routes | COMPLETE | 3 | ✅ |
| CHUNK-R2 | Business Logic | COMPLETE | 4 | ✅ |
| ...      | ...            | ...      | ...   | ...               |
```

### Inter-Phase Awareness
**RPI-Research KNOWS that RPI-Plan will:**
- Read the manifest row-by-row.
- Expect specific "Files Explored" and "Key Findings" sections for each chunk.
- Require chunk IDs to link plans back to research.

### Exit Criteria
- [ ] Research Manifest created with 5 domains.
- [ ] All chunks marked `COMPLETE`.
- [ ] Deep-dive details appended for each chunk.
- [ ] Inter-phase contract documented.

---

## Phase 2: PLAN

### Purpose
Design implementation with file:line precision using the Research Manifest as the source of truth.

### Artifacts
- Plan document in `.ai-context/plans/active/[feature]_plan.md`
- **Plan Manifest** (Linking Plan Chunks to Research Chunks)
- **Chunk-Based Todolists** (Atomic actions per chunk)

### Process
1. **Load Research Manifest**
   - Read `.ai-context/research/active/[feature]_research.md`.
2. **Create Plan Manifest**
   - For each `CHUNK-Rn` in Research Manifest:
     - Create a corresponding `CHUNK-Pn`.
     - Define the implementation strategy.
3. **Sequential Planning (Sub-Agents)**
   - **For each Plan Chunk:**
     - Start a sub-agent to generate the detailed todolist.
     - Define atomic actions (Change -> Test -> Commit).
     - Specify file:line numbers.
     - Mark linked Research Chunk as `PLANNED`.
4. **Finalize Output**
   - Ensure format matches RPI-Implement's expected input.

### Plan Manifest Format
```markdown
| Chunk ID | Linked Research | Status | Todos | Dependencies |
|----------|-----------------|--------|-------|--------------|
| CHUNK-P1 | CHUNK-R1        | READY  | 4     | None         |
| CHUNK-P2 | CHUNK-R2        | DRAFT  | -     | CHUNK-P1     |
```

### Inter-Phase Awareness
**RPI-Plan KNOWS that RPI-Implement will:**
- Execute `CHUNK-P1`, then `CHUNK-P2`, etc.
- Expect a "Todolist" table in each chunk section.
- Need exact file paths and line numbers to avoid searching.

### Exit Criteria
- [ ] Plan Manifest created linking all Research Chunks.
- [ ] All Research Chunks marked `PLANNED`.
- [ ] Detailed todolists for each Plan Chunk.
- [ ] Human approval obtained.

---

## Phase 3: IMPLEMENT

### Purpose
Execute atomically with continuous testing, strictly following the Plan Manifest.

### Golden Rule
```
READ MANIFEST -> SELECT CHUNK -> EXECUTE TODOS -> UPDATE STATUS -> NEXT CHUNK
```

### Process
1. **Load Plan Manifest**
   - Read `.ai-context/plans/active/[feature]_plan.md`.
2. **Sequential Execution (Loop)**
   - **For each ready CHUNK-Pn in Manifest:**
     - **Sub-Loop (Todos):**
       - 1. Make atomic change (from plan).
       - 2. Run specific test (from plan).
       - 3. Commit (if pass).
     - **Update Status:**
       - Mark `CHUNK-Pn` as `IMPLEMENTED` in Plan.
       - Mark linked `CHUNK-Rn` as `IMPLEMENTED` in Research.
3. **Context Management**
   - Reset context after every 3 chunks to maintain precision.

### Inter-Phase Awareness
**RPI-Implement KNOWS that:**
- It is the final consumer.
- It must update the *state* of previous documents (Research/Plan) to reflect reality.

### Exit Criteria
- [ ] All Plan Chunks marked `IMPLEMENTED`.
- [ ] All Research Chunks marked `IMPLEMENTED`.
- [ ] All tests passing.
- [ ] Documents archived.

---

## Inter-Phase Communication Protocol

### Research → Plan
**Input:** 5 Parallel Search Agents results.
**Output:** Research Manifest + Detailed Chunks.
**Contract:** "I have found X, Y, Z. Here is the map (manifest) and the details."

### Plan → Implement
**Input:** Research Manifest.
**Output:** Plan Manifest + Todolists.
**Contract:** "To build X, do steps 1-4. To build Y, do steps 5-9. Here is the order."

### Implement → Status
**Input:** Plan Manifest.
**Output:** Code + Updated Statuses.
**Contract:** "I have built X. Plan P1 is done. Research R1 is done."

---

**Version:** 3.0 (Manifest-Driven Parallel RPI)
**Status:** ACTIVE
