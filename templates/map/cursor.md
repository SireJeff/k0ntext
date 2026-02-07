# {{projectName}}

{{#if description}}
{{description}}
{{/if}}

## Architecture

```
{{#each architectureLayers}}
{{layer}}: {{#each components}}{{name}} {{/each}}
{{/each}}
```

## Key Files

| File | Purpose |
|------|---------|
{{#each keyFiles}}
| `{{path}}` | {{purpose}} |
{{/each}}

## Common Tasks

{{#each tasks}}
### {{title}}
```bash
{{command}}
```
{{/each}}

## Tech Stack

- **Languages:** {{languages}}
- **Frameworks:** {{frameworks}}
- **Tools:** {{tools}}

---
*Cursor context map*
