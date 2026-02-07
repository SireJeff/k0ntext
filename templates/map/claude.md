# {{projectName}}

## Context Map

> **Purpose:** Reduce hallucination, increase precision
> **Generated:** {{timestamp}}
> **Version:** {{version}}

### Codebase Context

```yaml
architecture:
  type: {{archType}}
  layers: {{layers}}
  patterns: {{patterns}}
tech_stack:
  languages: {{languages}}
  frameworks: {{frameworks}}
  databases: {{databases}}
```

### Session Context

| Aspect | Location | Key Points |
|--------|----------|------------|
{{#each sessionContext}}
| {{aspect}} | `{{location}}` | {{points}} |
{{/each}}

### Workflow Map

| Workflow | Status | File | Lines |
|----------|--------|------|-------|
{{#each workflows}}
| {{name}} | {{status}} | `{{file}}` | {{lines}} |
{{/each}}

### Architecture Map

```
┌─────────────────────────────────────────────────┐
│                    Entry Points                 │
{{#each entryPoints}}
│  • {{name}}: `{{file}}:{{line}}`
{{/each}}
├─────────────────────────────────────────────────┤
│                   Core Logic                    │
{{#each coreLogic}}
│  • {{module}}: `{{file}}:{{line}}`
{{/each}}
├─────────────────────────────────────────────────┤
│                   Data Layer                    │
{{#each dataLayer}}
│  • {{component}}: `{{file}}:{{line}}`
{{/each}}
└─────────────────────────────────────────────────┘
```

### Quick Reference

**Commands:**
```bash
{{#each commands}}
npm run {{name}}  # {{description}}
{{/each}}
```

**Key Files:**
```bash
{{#each keyFiles}}
{{path}}  # {{purpose}}
{{/each}}
```

### Cross-References

- **Related Workflows:** {{relatedWorkflows}}
- **Related Agents:** {{relatedAgents}}
- **See Also:** {{seeAlso}}

---
*This is a precise context map. For verbose documentation, see .claude/context/*
