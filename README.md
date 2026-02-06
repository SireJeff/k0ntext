# K0ntext

[![npm version](https://img.shields.io/npm/v/k0ntext.svg)](https://www.npmjs.com/package/k0ntext)
[![npm downloads](https://img.shields.io/npm/dt/k0ntext.svg)](https://www.npmjs.com/package/k0ntext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/SireJeff/k0ntext/workflows/CI/badge.svg)](https://github.com/SireJeff/k0ntext/actions)

Universal AI context engineering for Claude, GitHub Copilot, Cline, Cursor, Windsurf, Aider, Continue, Antigravity, and Gemini.

## 🚀 Quick Start

```bash
npm install -g k0ntext
k0ntext init
```

## 🖥️ Windows Support

K0ntext uses native SQLite extensions for high-performance vector search.

**For Windows Users:**
- We recommend using **Node.js LTS (v18, v20, v22)**.
- These versions have pre-built binaries and will install instantly without extra tools.
- If you use a non-LTS version (like v23/v24), you may need [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) to compile the database driver.

## ✨ Features

- 🧠 **Intelligent Analysis** - OpenRouter-powered codebase analysis with embeddings
- 🔍 **Semantic Search** - Vector database (sqlite-vec) for intelligent code retrieval
- 🔄 **Cross-Tool Sync** - Synchronize context across 9 AI tools
- 📊 **MCP Server** - 10 tools + 6 prompts for Model Context Protocol
- 🛠️ **Complete CLI** - 7 commands for context management
- 💾 **SQLite Storage** - Persistent database with SHA256 change detection

## 📖 Commands

### k0ntext init
Initialize new context for your project.

### k0ntext generate
Generate context files for all AI tools.

### k0ntext mcp
Start the Model Context Protocol server.

### k0ntext cleanup
Clean up context folders from other AI tools.

### k0ntext stats
View database statistics.

### k0ntext index
Index your codebase into the database.

### k0ntext search
Search your indexed code.

### k0ntext sync
Sync context across AI tools.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | API key for intelligent analysis via OpenRouter | For `--intelligent` flag |

### Database Location

By default, k0ntext stores its SQLite database at `.k0ntext.db` in the project root. This file is automatically added to `.gitignore`.

## 📦 Database & Migration

K0ntext uses a SQLite database (`~/.k0ntext.db`) for storing indexed code and context information. The database is automatically managed and includes:

- Codebase indexing with embeddings
- Change detection using SHA256 hashes
- Semantic search capabilities
- Knowledge graph relationships

## 🧹 Context Cleanup

Clean up context folders from other AI tools that may conflict with K0ntext's managed context.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

---

**Repository:** https://github.com/SireJeff/k0ntext
**npm Package:** https://www.npmjs.com/package/k0ntext
**Issues:** https://github.com/SireJeff/k0ntext/issues
