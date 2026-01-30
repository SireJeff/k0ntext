/**
 * Integration tests for existing context handling
 *
 * Tests custom content migration, --force flag behavior,
 * and cross-tool coordination with exists checks.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { generate } = require('../../lib/adapters/claude');
const { generate: generateCopilot } = require('../../lib/adapters/copilot');
const { findCustomContentInClaude, migrateCustomContent } = require('../../lib/content-preservation');
const { isManagedFile } = require('../../lib/template-coordination');

// Helper: Create temporary test directory
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ai-context-test-'));
}

// Helper: Create test file with content
function createTestFile(dir, relativePath, content) {
  const filePath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// Helper: Clean up directory
function cleanupDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('Existing Context Handling', () => {
  describe('Custom content migration', () => {
    it('should migrate custom agents from .claude/ to .ai-context/custom/', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create .claude/agents/custom-agent.md (no managed header)
        const claudeDir = path.join(tempDir, '.claude', 'agents');
        fs.mkdirSync(claudeDir, { recursive: true });
        const customAgentPath = path.join(claudeDir, 'my-custom-agent.md');
        fs.writeFileSync(customAgentPath, '# My Custom Agent\n\nThis is custom content without managed header.', 'utf-8');

        // Setup: Create .ai-context directory (required for migration)
        const aiContextDir = path.join(tempDir, '.ai-context');
        fs.mkdirSync(aiContextDir, { recursive: true });

        // Run: find custom content
        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        // Assert: Custom content was found
        expect(customItems.length).toBeGreaterThan(0);
        expect(customItems[0].type).toBe('agent');
        // Normalize path for comparison (Windows uses backslashes)
        expect(customItems[0].path.replace(/\\/g, '/')).toBe('agents/my-custom-agent.md');

        // Run: migrate custom content
        const migrated = migrateCustomContent(path.join(tempDir, '.claude'), aiContextDir, customItems);

        // Assert: File exists in .ai-context/custom/
        const migratedPath = path.join(aiContextDir, 'custom', 'agents', 'my-custom-agent.md');
        expect(fs.existsSync(migratedPath)).toBe(true);

        // Assert: Has preservation header
        const migratedContent = fs.readFileSync(migratedPath, 'utf-8');
        // Normalize path for comparison (Windows uses backslashes)
        expect(migratedContent).toContain('PRESERVED FROM .claude/agents');
        expect(migratedContent).toContain('my-custom-agent.md');
        expect(migratedContent).toContain('# My Custom Agent');

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should not migrate files with managed headers', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create .claude/agents/managed-agent.md with managed header
        const claudeDir = path.join(tempDir, '.claude', 'agents');
        fs.mkdirSync(claudeDir, { recursive: true });
        const managedAgentPath = path.join(claudeDir, 'managed-agent.md');
        fs.writeFileSync(managedAgentPath, '<!--\nMANAGED BY CREATE-AI-CONTEXT\nDo not edit manually.\n-->\n# Managed Agent\n\nThis is managed content.', 'utf-8');

        // Setup: Create .ai-context directory
        const aiContextDir = path.join(tempDir, '.ai-context');
        fs.mkdirSync(aiContextDir, { recursive: true });

        // Run: find custom content
        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        // Assert: No custom content found (managed file was ignored)
        expect(customItems.length).toBe(0);

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should migrate multiple custom items in one run', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create multiple custom files in different subdirs
        const claudeDir = path.join(tempDir, '.claude');

        // Custom agent
        createTestFile(claudeDir, 'agents/custom-agent.md', '# Custom Agent\n\nCustom agent content.');

        // Custom command
        createTestFile(claudeDir, 'commands/my-command.md', '# My Command\n\nCustom command.');

        // Custom workflow
        createTestFile(claudeDir, 'workflows/custom-workflow.md', '# Custom Workflow\n\nCustom workflow.');

        // Managed file (should be ignored)
        createTestFile(claudeDir, 'agents/managed.md', '<!-- MANAGED BY CREATE-AI-CONTEXT -->\n# Managed');

        // Setup: Create .ai-context directory
        const aiContextDir = path.join(tempDir, '.ai-context');
        fs.mkdirSync(aiContextDir, { recursive: true });

        // Run: migrate all custom content
        const customItems = findCustomContentInClaude(claudeDir);
        const migrated = migrateCustomContent(claudeDir, aiContextDir, customItems);

        // Assert: All custom files migrated
        expect(migrated.length).toBe(3);
        expect(migrated.find(m => m.type === 'agent')).toBeDefined();
        expect(migrated.find(m => m.type === 'command')).toBeDefined();
        expect(migrated.find(m => m.type === 'workflow')).toBeDefined();

        // Assert: All files exist in destination
        expect(fs.existsSync(path.join(aiContextDir, 'custom', 'agents', 'custom-agent.md'))).toBe(true);
        expect(fs.existsSync(path.join(aiContextDir, 'custom', 'commands', 'my-command.md'))).toBe(true);
        expect(fs.existsSync(path.join(aiContextDir, 'custom', 'workflows', 'custom-workflow.md'))).toBe(true);

      } finally {
        cleanupDir(tempDir);
      }
    });
  });

  describe('--force flag behavior', () => {
    it('should regenerate symlinks when force is set', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create existing .claude/ with custom files
        const claudeDir = path.join(tempDir, '.claude', 'agents');
        fs.mkdirSync(claudeDir, { recursive: true });
        const customAgentPath = path.join(claudeDir, 'custom-agent.md');
        fs.writeFileSync(customAgentPath, '# Custom Agent\n\nThis is custom content.', 'utf-8');

        // Setup: Create .ai-context directory structure
        const aiContextDir = path.join(tempDir, '.ai-context');
        fs.mkdirSync(path.join(aiContextDir, 'agents'), { recursive: true });
        fs.mkdirSync(path.join(aiContextDir, 'commands'), { recursive: true });
        fs.mkdirSync(path.join(aiContextDir, 'indexes'), { recursive: true });

        // Setup: Create minimal analysis and config
        const analysis = {
          techStack: { summary: 'Test Project' },
          entryPoints: [],
          workflows: [],
          architecture: {}
        };

        const configForce = {
          projectName: 'test-project',
          force: true,
          verbose: false
        };

        // Run: generate with force enabled
        const result = await generate(analysis, configForce, tempDir);

        // Assert: Generation succeeded (no skip error)
        expect(result.success).toBe(true);
        expect(result.errors.some(e => e.code === 'EXISTS_CUSTOM')).toBe(false);

        // Assert: .claude/ directory was regenerated
        expect(fs.existsSync(path.join(tempDir, '.claude', 'settings.json'))).toBe(true);

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should skip and migrate when force is not set', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create existing .claude/ with custom files
        const claudeDir = path.join(tempDir, '.claude', 'agents');
        fs.mkdirSync(claudeDir, { recursive: true });
        const customAgentPath = path.join(claudeDir, 'custom-agent.md');
        fs.writeFileSync(customAgentPath, '# Custom Agent\n\nThis is custom content.', 'utf-8');

        // Setup: Create .ai-context directory structure
        const aiContextDir = path.join(tempDir, '.ai-context');
        fs.mkdirSync(aiContextDir, { recursive: true });

        // Setup: Create minimal analysis and config
        const analysis = {
          techStack: { summary: 'Test Project' },
          entryPoints: [],
          workflows: [],
          architecture: {}
        };

        const configNoForce = {
          projectName: 'test-project',
          force: false,
          verbose: false
        };

        // Run: generate without force
        const result = await generate(analysis, configNoForce, tempDir);

        // Assert: Got EXISTS_CUSTOM warning
        expect(result.errors.some(e => e.code === 'EXISTS_CUSTOM')).toBe(true);

        // Assert: Got MIGRATED_CUSTOM info
        expect(result.errors.some(e => e.code === 'MIGRATED_CUSTOM')).toBe(true);

        // Assert: Custom file was migrated
        const migratedPath = path.join(aiContextDir, 'custom', 'agents', 'custom-agent.md');
        expect(fs.existsSync(migratedPath)).toBe(true);

        const migratedContent = fs.readFileSync(migratedPath, 'utf-8');
        // Normalize path for comparison (Windows uses backslashes)
        expect(migratedContent).toContain('PRESERVED FROM .claude/agents');
        expect(migratedContent).toContain('custom-agent.md');

      } finally {
        cleanupDir(tempDir);
      }
    });
  });

  describe('Cross-tool coordination', () => {
    it('should detect existing custom copilot-instructions.md and warn', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create .github/copilot-instructions.md (custom content)
        const githubDir = path.join(tempDir, '.github');
        fs.mkdirSync(githubDir, { recursive: true });
        const copilotPath = path.join(githubDir, 'copilot-instructions.md');
        fs.writeFileSync(copilotPath, '# Custom Copilot Instructions\n\nThis is custom content without managed header.', 'utf-8');

        // Setup: Create minimal analysis and config
        const analysis = {
          techStack: { summary: 'Test Project' },
          entryPoints: [],
          workflows: [],
          architecture: {}
        };

        const config = {
          projectName: 'test-project',
          force: false,
          verbose: false
        };

        // Run: generate for copilot
        const result = await generateCopilot(analysis, config, tempDir);

        // Assert: EXISTS_CUSTOM error returned
        expect(result.errors.some(e => e.code === 'EXISTS_CUSTOM')).toBe(true);

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should regenerate if file has managed header', async () => {
      const tempDir = createTempDir();

      try {
        // Setup: Create .github/copilot-instructions.md with managed header
        const githubDir = path.join(tempDir, '.github');
        fs.mkdirSync(githubDir, { recursive: true });
        const copilotPath = path.join(githubDir, 'copilot-instructions.md');
        fs.writeFileSync(copilotPath, '<!--\nMANAGED BY CREATE-AI-CONTEXT\n-->\n# Existing Instructions', 'utf-8');

        // Setup: Create minimal analysis and config
        const analysis = {
          techStack: { summary: 'Test Project' },
          entryPoints: [],
          workflows: [],
          architecture: {}
        };

        const config = {
          projectName: 'test-project',
          force: false,
          verbose: false
        };

        // Run: generate for copilot
        const result = await generateCopilot(analysis, config, tempDir);

        // Assert: File regenerated (success, no EXISTS_CUSTOM error)
        expect(result.success).toBe(true);
        expect(result.errors.some(e => e.code === 'EXISTS_CUSTOM')).toBe(false);

        // Assert: File was updated (project name is test-project)
        const newContent = fs.readFileSync(copilotPath, 'utf-8');
        expect(newContent).toContain('test-project');

      } finally {
        cleanupDir(tempDir);
      }
    });
  });

  describe('Managed file detection', () => {
    it('should detect files with CREATE-AI-CONTEXT marker as managed', () => {
      const tempDir = createTempDir();

      try {
        // Create file with managed marker (correct marker)
        const managedPath = createTestFile(tempDir, 'managed.md', '<!--\nMANAGED BY CREATE-AI-CONTEXT\n-->\nContent');

        expect(isManagedFile(managedPath)).toBe(true);

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should detect files with Auto-generated marker as managed', () => {
      const tempDir = createTempDir();

      try {
        // Create file with auto-generated marker
        const managedPath = createTestFile(tempDir, 'managed.md', '*Auto-generated by AI Context Engineering*\nContent');

        expect(isManagedFile(managedPath)).toBe(true);

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should detect files without markers as custom', () => {
      const tempDir = createTempDir();

      try {
        // Create file without managed marker
        const customPath = createTestFile(tempDir, 'custom.md', '# Custom Content\n\nThis is custom.');

        expect(isManagedFile(customPath)).toBe(false);

      } finally {
        cleanupDir(tempDir);
      }
    });
  });

  describe('Content type determination', () => {
    it('should correctly determine agent type from path', () => {
      const tempDir = createTempDir();

      try {
        // Create agent file
        createTestFile(tempDir, '.claude/agents/my-agent.md', '# Agent');

        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        expect(customItems.length).toBe(1);
        expect(customItems[0].type).toBe('agent');

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should correctly determine command type from path', () => {
      const tempDir = createTempDir();

      try {
        // Create command file
        createTestFile(tempDir, '.claude/commands/my-command.md', '# Command');

        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        expect(customItems.length).toBe(1);
        expect(customItems[0].type).toBe('command');

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should correctly determine workflow type from path', () => {
      const tempDir = createTempDir();

      try {
        // Create workflow file
        createTestFile(tempDir, '.claude/workflows/my-workflow.md', '# Workflow');

        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        expect(customItems.length).toBe(1);
        expect(customItems[0].type).toBe('workflow');

      } finally {
        cleanupDir(tempDir);
      }
    });

    it('should handle Windows path separators correctly', () => {
      const tempDir = createTempDir();

      try {
        // Create file in nested directory (Windows-style paths)
        createTestFile(tempDir, '.claude\\agents\\my-agent.md', '# Agent');

        const customItems = findCustomContentInClaude(path.join(tempDir, '.claude'));

        expect(customItems.length).toBe(1);
        expect(customItems[0].type).toBe('agent');

      } finally {
        cleanupDir(tempDir);
      }
    });
  });
});
