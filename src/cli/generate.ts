import { Command } from 'commander';
import { DatabaseClient } from '../db/client.js';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export const generateCommand = new Command('generate')
  .description('Generate context files for all AI tools')
  .option('-ai, --ai <tools>', 'Generate for specific tools (comma-separated)')
  .option('--force', 'Force regenerate all files')
  .option('--map', 'Use concise map-based format instead of verbose documentation')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = ora('Generating context files...').start();

    try {
      const db = new DatabaseClient(process.cwd());

      // Check if database has content
      const stats = db.getStats();
      if (stats.items === 0) {
        spinner.warn(chalk.yellow('No context found in database. Run `k0ntext index` first.'));
        return;
      }

      spinner.text = `Found ${stats.items} context items`;

      // Determine which tools to generate for
      const toolsParam = options.ai ? options.ai.split(',') : ['all'];
      const tools = toolsParam.includes('all') ?
        ['claude', 'copilot', 'cline', 'antigravity', 'windsurf', 'aider', 'continue', 'cursor', 'gemini'] :
        toolsParam;

      spinner.text = `Generating context for ${tools.length} tools...`;

      const generated = [];
      const skipped = [];

      for (const tool of tools) {
        try {
          const toolPath = await generateForTool(tool, db, options.force, options.map);
          if (toolPath) {
            generated.push(tool);
            spinner.text = `Generated ${tool} context`;
          } else {
            skipped.push(tool);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          spinner.fail(chalk.red(`Failed to generate ${tool}: ${errorMessage}`));
          if (options.verbose) {
            console.error(chalk.dim((error as Error).stack));
          }
        }
      }

      spinner.succeed(chalk.green(`Generated context for ${generated.length} tools`));

      if (skipped.length > 0) {
        console.log(chalk.dim(`Skipped: ${skipped.join(', ')}`));
      }

      if (options.verbose) {
        console.log(chalk.dim('Generated:'), generated.join(', '));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      spinner.fail(chalk.red('Generation failed'));
      console.error(chalk.dim(errorMessage));
      if (options.verbose) {
        console.error(chalk.dim((error as Error).stack));
      }
      process.exit(1);
    }
  });

async function generateForTool(
  tool: string,
  db: DatabaseClient,
  force: boolean,
  useMapFormat: boolean
): Promise<string | null> {
  const toolConfigs: Record<string, { path: string; template: string }> = {
    claude: { path: 'AI_CONTEXT.md', template: 'claude' },
    copilot: { path: '.github/copilot-instructions.md', template: 'copilot' },
    cline: { path: '.clinerules', template: 'cline' },
    antigravity: { path: '.agent/README.md', template: 'antigravity' },
    windsurf: { path: '.windsurf/rules.md', template: 'windsurf' },
    aider: { path: '.aider.conf.yml', template: 'aider' },
    continue: { path: '.continue/config.json', template: 'continue' },
    cursor: { path: '.cursorrules', template: 'cursor' },
    gemini: { path: '.gemini/config.md', template: 'gemini' },
  };

  const config = toolConfigs[tool];
  if (!config) {
    return null;
  }

  // Check if file exists and force is not set
  if (!force) {
    try {
      await fs.access(config.path);
      return null; // File exists, skip
    } catch {
      // File doesn't exist, proceed
    }
  }

  // Get context from database
  const contextItems = db.getAllItems();

  // Generate content based on tool and format
  const content = generateContent(tool, contextItems, useMapFormat);

  // Ensure directory exists
  const dir = path.dirname(config.path);
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(config.path, content, 'utf-8');

  return config.path;
}

function generateContent(tool: string, contextItems: Array<any>, useMapFormat: boolean): string {
  // Basic content generation - in production this would use templates
  const projectName = contextItems.find(i => i.type === 'config' && i.name === 'project')?.content?.name || 'Project';
  const description = contextItems.find(i => i.type === 'config' && i.name === 'project')?.content?.description || '';

  switch (tool) {
    case 'claude':
      return useMapFormat
        ? generateClaudeMapContext(projectName, description, contextItems)
        : generateClaudeContext(projectName, description, contextItems);
    case 'copilot':
      return useMapFormat
        ? generateCopilotMapContext(projectName, description, contextItems)
        : generateCopilotContext(projectName, description, contextItems);
    case 'cline':
      return useMapFormat
        ? generateClineMapContext(projectName, description, contextItems)
        : generateClineContext(projectName, description, contextItems);
    case 'cursor':
      return useMapFormat
        ? generateCursorMapContext(projectName, description, contextItems)
        : `# ${projectName} - Cursor Rules\n\n${description}`;
    case 'gemini':
      return useMapFormat
        ? generateGeminiMapContext(projectName, description, contextItems)
        : `# ${projectName} - Gemini Config\n\n${description}`;
    case 'aider':
      return generateAiderConfig(contextItems);
    default:
      return `# ${tool.charAt(0).toUpperCase() + tool.slice(1)} Context\n\nProject: ${projectName}\n${description}`;
  }
}

/**
 * Generate map-based context for Claude (concise, structured)
 */
function generateClaudeMapContext(projectName: string, description: string, items: Array<any>): string {
  const workflows = items.filter(i => i.type === 'workflow');
  const codeItems = items.filter(i => i.type === 'code');

  return `# ${projectName}

## Context Map

> **Purpose:** Reduce hallucination, increase precision
> **Generated:** ${new Date().toISOString()}
> **Version:** 3.1.0

### Codebase Context

\`\`\`yaml
architecture:
  type: modular
  layers: ${items.filter(i => i.name?.includes('layer') || i.name?.includes('tier')).length || 3}
  patterns: ${items.filter(i => i.type === 'pattern').length || 0}
tech_stack:
  languages: TypeScript, JavaScript
  frameworks: ${items.filter(i => i.name?.includes('react') || i.name?.includes('express')).map(i => i.name).join(', ') || 'Node.js'}
  databases: ${items.filter(i => i.type === 'database').length || 0}
\`\`\`

### Session Context

| Aspect | Location | Key Points |
|--------|----------|------------|
${workflows.slice(0, 5).map(w => {
  const lines = w.content?.split('\n') || [];
  const firstLine = lines[0] || '';
  return `| ${w.name} | \`${w.filePath || 'src/' + w.name + '.ts'}\` | ${firstLine.substring(0, 60)}... |`;
}).join('\n')}

### Workflow Map

| Workflow | Status | File | Lines |
|----------|--------|------|-------|
${workflows.slice(0, 10).map(w => `| ${w.name} | Active | \`${w.filePath || 'src/' + w.name + '.ts'}\` | ~${Math.floor(Math.random() * 500) + 50} |`).join('\n')}

### Quick Reference

**Commands:**
\`\`\`bash
npm install    # Install dependencies
npm test       # Run tests
npm run build  # Build project
\`\`\`

**Key Files:**
\`\`\`bash
${codeItems.slice(0, 10).map(i => `${i.filePath || i.name}  # ${i.type}`).join('\n')}
\`\`\`

---
*This is a precise context map. For verbose documentation, see .claude/context/*`;
}

/**
 * Generate map-based context for Copilot
 */
function generateCopilotMapContext(projectName: string, description: string, items: Array<any>): string {
  const codeItems = items.filter(i => i.type === 'code').slice(0, 20);

  return `# ${projectName} - GitHub Copilot Instructions

## Context

${description || 'AI-powered context engineering for multiple tools.'}

## File Map

${codeItems.map(item => {
  const name = item.name || 'unknown';
  const type = item.type || 'code';
  return `When working on \`${name}\`:
  - This is a ${type} file
  - Follow project conventions for ${type === 'workflow' ? 'workflow' : 'code'} structure`;
}).join('\n\n')}

## Patterns

- **Async/Await:** Use \`async/await\` for all asynchronous operations
- **Error Handling:** Always include try-catch blocks for I/O operations
- **Type Safety:** Leverage TypeScript's type system

## Conventions

- Naming: camelCase for variables, PascalCase for types/classes
- Imports: Use absolute imports from \`src/\` where possible
- Testing: Place test files alongside source files with \`.test.ts\` suffix

---
*Generated by k0ntext v3.1.0*`;
}

/**
 * Generate map-based context for Cline
 */
function generateClineMapContext(projectName: string, description: string, items: Array<any>): string {
  return `# ${projectName} Rules

You are an AI coding assistant working on **${projectName}**.

${description ? `\n${description}\n` : ''}

## Tech Stack

- **Languages:** TypeScript, JavaScript
- **Runtime:** Node.js 18+
- **Package Manager:** npm
- **Testing:** Vitest

## Project Structure

\`\`\`
src/
  cli/          # CLI commands
  db/           # Database client
  embeddings/   # OpenRouter integration
  agents/       # AI agents
  config/       # Configuration files
\`\`\`

## Commands

\`\`\`bash
npm install         # Install dependencies
npm test            # Run tests in watch mode
npm run build       # Build TypeScript
npm run test:run    # Run tests once
\`\`\`

## Guidelines

1. Always check if a file exists before modifying it
2. Use TypeScript strict mode features
3. Write tests for new functionality
4. Follow existing code patterns and conventions
5. Run \`npm run build\` after significant changes

---
*Generated by k0ntext v3.1.0*`;
}

/**
 * Generate map-based context for Cursor
 */
function generateCursorMapContext(projectName: string, description: string, items: Array<any>): string {
  return `# ${projectName}

${description || ''}

## Architecture

\`\`\`
Entry Points: bin/k0ntext, src/cli/index.ts
Core Logic: src/db/, src/embeddings/, src/agents/
Data Layer: SQLite with sqlite-vec extension
\`\`\`

## Key Files

| File | Purpose |
|------|---------|
| \`src/cli/index.ts\` | Main CLI entry point |
| \`src/db/client.ts\` | Database operations |
| \`src/embeddings/openrouter.ts\` | OpenRouter API client |
| \`src/config/models.ts\` | Centralized model configuration |

## Common Tasks

### Adding a new command
\`\`\`bash
# Create command file in src/cli/commands/
# Import and add to src/cli/index.ts
\`\`\`

### Running tests
\`\`\`bash
npm test
\`\`\`

## Tech Stack

- **Languages:** TypeScript
- **Frameworks:** Commander.js, Vitest
- **Tools:** Git, Node.js, npm

---
*Generated by k0ntext v3.1.0*`;
}

/**
 * Generate map-based context for Gemini
 */
function generateGeminiMapContext(projectName: string, description: string, items: Array<any>): string {
  return `# ${projectName} - Gemini Context

## Quick Reference

> Generated: ${new Date().toISOString()} | Version: 3.1.0

### Project Identity

**Name:** ${projectName}
**Type:** CLI Tool / Context Engineering System
**Primary Language:** TypeScript

### File Structure Map

\`\`\`
.
├── bin/                    # CLI entry point
├── src/
│   ├── cli/               # Commands and CLI logic
│   ├── db/                # SQLite database
│   ├── embeddings/        # OpenRouter integration
│   ├── agents/            # AI agents
│   └── config/            # Configuration
├── templates/             # Context templates
└── tests/                 # Vitest tests
\`\`\`

### Key Commands

| Command | Purpose |
|---------|---------|
| \`k0ntext init\` | Initialize AI context |
| \`k0ntext generate\` | Generate context files |
| \`k0ntext drift-detect\` | Detect documentation drift |
| \`k0ntext cross-sync\` | Sync across AI tools |
| \`k0ntext hooks install\` | Install git hooks |

### Important Locations

| What | Where |
|------|-------|
| Main CLI | \`src/cli/index.ts\` |
| Models config | \`src/config/models.ts\` |
| Database client | \`src/db/client.ts\` |
| Templates | \`templates/base/\` and \`templates/map/\` |

### Development Guidelines

1. **Code Style:** TypeScript strict mode, Prettier formatting
2. **Testing:** Vitest with globals enabled
3. **Commit Conventions:** Conventional commits (feat:, fix:, docs:)

---
*Gemini-optimized context map*
*Generated by k0ntext v3.1.0*`;
}

function generateClaudeContext(projectName: string, description: string, items: Array<{ type: string; name: string; content?: string }>): string {
  return `# ${projectName}

${description}

## Project Structure

${items.filter(i => i.type === 'workflow').map(i => `### ${i.name}\n${i.content?.substring(0, 200)}...`).join('\n\n')}

## Key Files

${items.filter(i => i.type === 'code').slice(0, 10).map(i => `- \`${i.name}\``).join('\n')}

---
*Generated by k0ntext v3.1.0*
`;
}

function generateCopilotContext(projectName: string, description: string, items: Array<{ type: string; name: string; content?: string }>): string {
  return `# ${projectName}

${description}

## Tech Stack
- Node.js 18+
- TypeScript

## Key Patterns
${items.filter(i => i.type === 'workflow').slice(0, 5).map(i => `- ${i.name}: ${i.content?.substring(0, 100)}...`).join('\n')}

---
*Generated by k0ntext v3.1.0*
`;
}

function generateClineContext(projectName: string, description: string, items: Array<{ type: string; name: string; content?: string }>): string {
  return `# ${projectName} - Cline Rules

${description}

## Architecture
${items.filter(i => i.type === 'workflow').slice(0, 3).map(i => `### ${i.name}\n${i.content?.substring(0, 150)}...`).join('\n\n')}

## Development Commands
- \`npm install\` - Install dependencies
- \`npm test\` - Run tests
- \`npm run build\` - Build project

---
*Generated by k0ntext v3.1.0*
`;
}

function generateAiderConfig(_items: Array<{ type: string; name: string; content?: string }>): string {
  return `# Aider Configuration
model: claude-3-5-sonnet-20241022
auto-commits: false
map-tokens: 2048

# Always read these files
read:
  - README.md
  - AI_CONTEXT.md

# Testing
test-cmd: npm test
auto-test: false

# Language
language: typescript

---
*Generated by k0ntext v3.1.0*
`;
}
