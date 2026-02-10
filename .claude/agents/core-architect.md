---
name: core-architect
version: "1.0.0"
displayName: "Core Architect"
description: "System architecture, state machines, and high-level design specialist"
category: "architecture"
complexity: "high"
context_budget: "~50K tokens"
capabilities:
  - "system-architecture-design"
  - "state-machine-analysis"
  - "dependency-mapping"
  - "scalability-planning"
  - "design-pattern-recommendation"
workflows:
  - "authentication"
  - "system-core"
  - "data-flow"
commands: ["/rpi-research", "/rpi-plan"]
dependencies:
  agents: []
  commands: ["/rpi-research"]
hooks:
  pre_invoke: null
  post_invoke: "verify-docs-current"
examples:
  - invocation: '@core-architect "Document system architecture"'
    description: "Create comprehensive architecture documentation"
  - invocation: '@core-architect "Analyze state transitions in [component]"'
    description: "Map state machine and transitions"
  - invocation: '@core-architect "Identify scalability bottlenecks"'
    description: "Performance and scaling analysis"
---

# Core Architect Agent

**Purpose:** System architecture, state machines, and high-level design

## Capabilities

This agent specializes in:
- **System architecture design** - Creating and validating architectural diagrams
- **State machine analysis** - Understanding and documenting state transitions
- **High-level system design** - Planning and documenting system components
- **Dependency mapping** - Visualizing component dependencies
- **Scalability planning** - Designing for growth and performance

## Usage

After template initialization, this agent will be generated based on your project's architecture. It will:
1. Analyze your existing architecture
2. Create comprehensive architecture documentation
3. Identify potential bottlenecks and scalability issues
4. Provide recommendations for improved design

## Example Commands

```bash
@core-architect "Document system architecture for [feature]"
@core-architect "Analyze state transitions in [component]"
@core-architect "Identify scalability bottlenecks"
```

## Integration Points

This agent integrates with:
- Workflow documentation
- Database schema analysis
- API design documentation
- Deployment strategies

## Validation

- Architecture consistency checks
- State machine validation
- Dependency consistency verification

---

## k0ntext CLI Commands

This agent integrates with the following k0ntext CLI commands:

| Command | When to Use |
|---------|-------------|
| `k0ntext init` | First-time project setup - analyzes architecture during initialization |
| `k0ntext generate` | After architectural changes - regenerates context for all AI tools |
| `k0ntext drift-detect` | When code may have diverged from architecture docs - AI-powered drift detection |
| `k0ntext cross-sync` | After drift detected - intelligent cross-tool synchronization |
| `k0ntext search <query>` | Finding related architecture decisions - search indexed content |

### Command Examples

```bash
# Initialize with architecture analysis
k0ntext init

# Detect documentation drift
k0ntext drift-detect

# Cross-sync after detecting drift
k0ntext cross-sync

# Search for architecture patterns
k0ntext search "authentication flow"

# Generate contexts after architecture changes
k0ntext generate --tools claude,cursor
```

### Workflow Integration

When designing architecture:
1. **Before design:** Run `k0ntext search <pattern>` to find existing architecture patterns
2. **During design:** Reference discovered workflows and patterns
3. **After changes:** Use `k0ntext drift-detect` to identify documentation that needs updating
4. **Before commit:** Run `k0ntext cross-sync` to propagate changes across all AI tools
