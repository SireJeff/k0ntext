# {{projectName}} - Gemini Context

## Quick Reference

> Generated: {{timestamp}} | Version: {{version}}

### Project Identity

**Name:** {{projectName}}
**Type:** {{projectType}}
**Primary Language:** {{primaryLanguage}}

### File Structure Map

```
{{#each fileStructure}}
{{indent}}{{name}}/
{{#each children}}
{{indent}}  {{.}}
{{/each}}
{{/each}}
```

### Key Commands

| Command | Purpose |
|---------|---------|
{{#each commands}}
| `{{cmd}}` | {{purpose}} |
{{/each}}

### Important Locations

| What | Where |
|------|-------|
{{#each locations}}
| {{what}} | `{{where}}` |
{{/each}}

### Development Guidelines

1. **Code Style:** {{codeStyle}}
2. **Testing:** {{testingApproach}}
3. **Commit Conventions:** {{commitStyle}}

---
*Gemini-optimized context map*
