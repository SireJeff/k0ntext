# Contributing to K0ntext

We love contributions! Whether you're fixing a bug, improving documentation, or adding new features, we want your input. Here's how you can contribute:

## Getting Started

### Prerequisites
- Node.js 18+ (required)
- Basic knowledge of TypeScript
- Familiarity with the context engineering concepts described in the README
- Git knowledge (for submitting changes)

### Setting Up
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/k0ntext.git`
3. Install dependencies: `cd k0ntext && npm install`
4. Build the project: `npm run build`
5. Run tests: `npm run test:run`
6. Create a new branch for your changes: `git checkout -b feature/your-feature`

## Contribution Guidelines

### Code Contributions
- **Small, focused changes**: Prefer small, atomic changes that solve one problem
- **Testing**: Include tests for new functionality (Vitest)
- **Documentation**: Update documentation when adding or changing functionality
- **Style**: Follow the existing TypeScript code style and formatting

### Documentation Contributions
- **Clarity**: Write clear, concise documentation
- **Consistency**: Maintain consistent terminology and formatting
- **Completeness**: Ensure all features and usage patterns are documented
- **Cross-Tool Sync**: Document new sync features in README and CHANGELOG
- **CLI Commands**: Update help text and examples for new commands

### CLI & Source Contributions
For changes to `src/`:
- Follow existing TypeScript patterns
- Add appropriate error handling
- Update schemas in `templates/base/schemas/` if adding new structures
- Run `k0ntext validate` before submitting

### Cross-Tool Sync Contributions
For changes to sync or template systems:
- Ensure file hashing works correctly (SHA-256)
- Test with all conflict resolution strategies
- Verify git hooks installation
- Test sync state persistence

### Quality Standards
- Review the quality checklist in `templates/base/standards/`
- For extensions, follow the extension guidelines in `templates/base/standards/`

## Areas Looking for Contributors

### New AI Tool Support
We're always looking to improve support for AI coding tools. Current supported tools:
- Claude Code, GitHub Copilot, Cursor, Windsurf, Cline, Aider, Continue, Antigravity, Gemini

Know of a new AI tool that needs context files? Help us integrate it! See `src/` for existing patterns.

### Improvements Wanted
- Better semantic search algorithms
- Additional MCP server tools
- Performance optimizations for large codebases
- Improved template system
- Better Windows compatibility

### Documentation
- Improve troubleshooting guides
- Write tutorials for specific use cases
- Create video demos

## Issue Reporting

When creating an issue, please provide:
- **Description**: A clear description of the problem or suggestion
- **Steps to Reproduce**: For bugs, detailed steps to reproduce
- **Expected vs Actual Behavior**: What you expected to happen vs what actually happened
- **Environment**: Your environment details (OS, Node.js version, AI tool)

## Pull Request Process

1. **Update the README** if you change functionality that users need to know about
2. **Add tests** if you add new functionality (182+ tests and counting)
3. **Update documentation** if you change existing functionality
4. **Update CHANGELOG.md** with your changes
5. **Ensure tests pass**: `npm run test:run`
6. **Submit your PR** with a clear description of changes

## Development Workflow

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/k0ntext.git
cd k0ntext

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test:run

# Run tests in watch mode
npm test

# Lint code
npm run lint

# Link for local testing
npm link
k0ntext --version
```

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Vision

We're building toward the **Universal AI Context Standard** -- an open specification that all AI coding tools can adopt for efficient context management. Every contribution brings us closer to that goal.

## Contact

For questions or discussions, please open an issue or reach out to the maintainers.

---

**Version:** 3.8.0 | **Last Updated:** 2026-02-11
