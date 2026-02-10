---
name: api-developer
version: "1.0.0"
displayName: "API Developer"
description: "API design, contract definition, and endpoint implementation specialist"
category: "api"
complexity: "medium"
context_budget: "~35K tokens"
capabilities:
  - "rest-api-design"
  - "graphql-design"
  - "contract-definition"
  - "endpoint-documentation"
  - "api-testing-strategy"
workflows:
  - "api-endpoints"
  - "contracts"
  - "versioning"
commands: ["/rpi-research", "/rpi-plan", "/rpi-implement"]
dependencies:
  agents: []
  commands: []
hooks:
  pre_invoke: null
  post_invoke: "verify-docs-current"
examples:
  - invocation: '@api-developer "Document API endpoints for [resource]"'
    description: "Create comprehensive API documentation"
  - invocation: '@api-developer "Validate API contracts"'
    description: "Check contract consistency and completeness"
  - invocation: '@api-developer "Generate OpenAPI spec"'
    description: "Create OpenAPI/Swagger specification"
---

# API Developer Agent

**Purpose:** API design, contract definition, and endpoint implementation

## Capabilities

This agent specializes in:
- **API design** - Creating RESTful and GraphQL APIs with proper conventions
- **Contract definition** - Defining request/response schemas and validation rules
- **Endpoint implementation** - Generating boilerplate for API endpoints
- **Documentation generation** - Creating comprehensive API documentation
- **Testing strategy** - Planning and implementing API tests

## Usage

After template initialization, this agent will be generated based on your API structure. It will:
1. Analyze your existing API endpoints
2. Create comprehensive API documentation
3. Identify potential security vulnerabilities
4. Provide recommendations for API optimization

## Example Commands

```bash
@api-developer "Document API endpoints for [resource]"
@api-developer "Validate API contracts for [endpoint]"
@api-developer "Generate test cases for [API]"
```

## Integration Points

This agent integrates with:
- Workflow documentation
- Database schema (for data endpoints)
- Testing strategies
- Security validation

## Validation

- API contract consistency
- Endpoint security checks
- Response schema validation

---

## k0ntext CLI Commands

This agent integrates with the following k0ntext CLI commands:

| Command | When to Use |
|---------|-------------|
| `k0ntext generate` | After API changes - regenerates API documentation for all AI tools |
| `k0ntext drift-detect` | When API may have diverged from docs - AI-powered drift detection |
| `k0ntext fact-check` | Validate API documentation accuracy - quality assurance for API specs |

### Command Examples

```bash
# Generate contexts after API changes
k0ntext generate --tools claude,cursor

# Detect API documentation drift
k0ntext drift-detect

# Fact-check API endpoint documentation
k0ntext fact-check

# Search for existing API patterns
k0ntext search "API endpoint"
```

### Workflow Integration

When developing APIs:
1. **Before changes:** Run `k0ntext search <resource>` to find existing endpoint patterns
2. **During development:** Reference indexed API contracts and examples
3. **After changes:** Use `k0ntext generate` to update all AI tool contexts
4. **Before commit:** Run `k0ntext drift-detect` to identify documentation gaps
5. **For QA:** Use `k0ntext fact-check` to validate documentation accuracy
