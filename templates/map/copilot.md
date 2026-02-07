# {{projectName}} - GitHub Copilot Instructions

## Context

{{#if description}}
{{description}}
{{/if}}

## File Map

{{#each fileMap}}
When working on `{{path}}`:
- {{#each notes}}
  - {{.}}
  - {{/each}}
{{/each}}

## Patterns

{{#each patterns}}
- **{{name}}:** Use `{{pattern}}` for {{purpose}}
{{/each}}

## Conventions

- Naming: {{namingConvention}}
- Imports: {{importStyle}}
- Testing: {{testStyle}}

---
*Copilot context map*
