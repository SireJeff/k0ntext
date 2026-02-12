# Packages

This repository contains the **k0ntext** npm package which includes the following components:

## Core Package

| Name | Version | Description |
|------|---------|-------------|
| `k0ntext` | `^3.8.1` | Universal AI context engineering toolkit for Claude, GitHub Copilot, Cline, Cursor, Windsurf, Aider, Continue, Antigravity, and Gemini |

### Installation

```bash
npm install -g k0ntext
```

### What's Included

The k0ntext package includes:

- **CLI Tool** (`bin/k0ntext.js`) - Command-line interface for all operations
- **TypeScript Source** - Fully typed source code in `src/`
- **Compiled JavaScript** - Built output in `dist/`
- **Handlebars Templates** - Rich context templates in `templates/handlebars/`
- **Agent System** - Intelligent agents in `agents/`
- **Documentation** - User guides and API docs in `docs/`
- **Schemas** - JSON schemas for validation and tooling in `templates/base/schemas/`
- **Database Support** - SQLite-based storage with vector embeddings
- **Snapshot Manager** - Database save/restore with compression
- **Todo Lists** - Persistent task lists that survive context compactions
- **MCP Server** - Model Context Protocol server integration

### Development

For development:
```bash
git clone https://github.com/SireJeff/k0ntext.git
cd k0ntext
npm install
npm run build
npm test
npm run dev
```

### License

This package is distributed under the **MIT License**.

See [LICENSE](LICENSE) for the full license text.
