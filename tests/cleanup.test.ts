import { CleanupAgent } from '../src/agents/cleanup-agent.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CleanupAgent', () => {
  let testDir: string;
  let cleanupAgent: CleanupAgent;

  beforeEach(() => {
    testDir = path.join(__dirname, 'test-cleanup');
    fs.mkdirSync(testDir, { recursive: true });
    cleanupAgent = new CleanupAgent();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should scan and identify tool folders', async () => {
    // Create test tool folders
    const toolFolders = ['.cursor', '.windsurf', '.vscode', '.idea'];
    for (const folder of toolFolders) {
      fs.mkdirSync(path.join(testDir, folder));
    }

    // Create non-tool folder
    fs.mkdirSync(path.join(testDir, 'normal-folder'));

    process.chdir(testDir);

    const result = await cleanupAgent.analyze();

    expect(result.scanned).toBe(toolFolders.length);
    expect(result.removed).toEqual(toolFolders.map(f => f + ' (dry-run)'));
    expect(result.kept).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('should respect keep option', async () => {
    const toolFolders = ['.cursor', '.windsurf', '.vscode'];
    const keepFolders = ['.vscode'];

    for (const folder of toolFolders) {
      fs.mkdirSync(path.join(testDir, folder));
    }

    process.chdir(testDir);

    const result = await cleanupAgent.analyze({ keep: keepFolders });

    expect(result.scanned).toBe(toolFolders.length);
    expect(result.removed).toEqual(['.cursor (dry-run)', '.windsurf (dry-run)']);
    expect(result.kept).toEqual(['.vscode (dry-run)']);
  });

  test('should handle non-existent folders gracefully', async () => {
    process.chdir(testDir);

    const result = await cleanupAgent.analyze();

    expect(result.scanned).toBe(0);
    expect(result.removed).toEqual([]);
    expect(result.kept).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('should handle errors during removal', async () => {
    // Create a folder with restricted permissions
    const restrictedFolder = '.restricted';
    fs.mkdirSync(path.join(testDir, restrictedFolder));

    // Make it read-only (Windows equivalent)
    try {
      fs.chmodSync(path.join(testDir, restrictedFolder), 0o444);
    } catch (e) {
      // Windows doesn't support chmod, just proceed
    }

    process.chdir(testDir);

    const result = await cleanupAgent.cleanup({ dryRun: false });

    expect(result.scanned).toBe(1);
    expect(result.removed).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('dry run should not actually remove folders', async () => {
    const toolFolder = '.cursor';
    fs.mkdirSync(path.join(testDir, toolFolder));

    process.chdir(testDir);

    const result = await cleanupAgent.cleanup({ dryRun: true });

    // Verify folder still exists
    expect(fs.existsSync(path.join(testDir, toolFolder))).toBe(true);
    expect(result.removed).toEqual([toolFolder + ' (dry-run)']);
  });

  test('should actually remove folders when not in dry run', async () => {
    const toolFolder = '.cursor';
    fs.mkdirSync(path.join(testDir, toolFolder));

    process.chdir(testDir);

    const result = await cleanupAgent.cleanup({ dryRun: false });

    // Verify folder was removed
    expect(fs.existsSync(path.join(testDir, toolFolder))).toBe(false);
    expect(result.removed).toEqual([toolFolder]);
  });
});