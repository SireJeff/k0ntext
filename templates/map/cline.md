# {{projectName}} Rules

You are an AI coding assistant working on **{{projectName}}**.

## Tech Stack

{{#each techStack}}
- **{{category}}:** {{items}}
{{/each}}

## Project Structure

```
{{#each directories}}
{{name}}/
{{#each files}}
  - {{.}}
{{/each}}
{{/each}}
```

## Commands

```bash
{{#each commands}}
{{name}}  # {{description}}
{{/each}}
```

## Guidelines

{{#each guidelines}}
1. {{.}}
{{/each}}

---
*Cline context map*
