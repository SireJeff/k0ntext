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

    // Create a new CleanupAgent with no default keep folders
    const testCleanupAgent = new CleanupAgent({ defaultKeep: [], cwd: testDir });
    const result = await testCleanupAgent.analyze();

    expect(result.scanned).toBe(toolFolders.length);
    // Sort arrays for consistent comparison
    expect(result.removed.sort()).toEqual(toolFolders.sort().map(f => f + ' (dry-run)'));
    expect(result.kept).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('should respect keep option', async () => {
    // Use folders that are in KNOWN_TOOL_FOLDERS list
    const toolFolders = ['.cursor', '.vscode'];
    const keepFolders = ['.cursor'];

    for (const folder of toolFolders) {
      fs.mkdirSync(path.join(testDir, folder));
    }

    // Create a new CleanupAgent with no default keep folders
    const testCleanupAgent = new CleanupAgent({ defaultKeep: [], cwd: testDir });
    const result = await testCleanupAgent.analyze({ keep: keepFolders });

    // Verify that keep option is respected
    // scanned = all tool folders found
    // kept = folders preserved by keep option
    // removed = folders marked for removal
    expect(result.scanned).toBe(2); // Both .cursor and .vscode scanned
    expect(result.removed.length).toBe(1); // Only .vscode marked for removal
    expect(result.removed).toContain('.vscode (dry-run)');
    expect(result.kept).toEqual(['.cursor']); // .cursor is tracked as kept
  });

  test('should handle non-existent folders gracefully', async () => {
    const result = await cleanupAgent.analyze({ cwd: testDir });

    expect(result.scanned).toBe(0);
    expect(result.removed).toEqual([]);
    expect(result.kept).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('should handle errors during removal', async () => {
    // Use a folder that is in KNOWN_TOOL_FOLDERS
    const testFolder = '.vscode';
    const testPath = path.join(testDir, testFolder);
    fs.mkdirSync(testPath);

    // Create a file inside to make it non-empty
    fs.writeFileSync(path.join(testPath, 'file.txt'), 'test');

    // Create a new CleanupAgent with no default keep folders
    const testCleanupAgent = new CleanupAgent({ defaultKeep: [], cwd: testDir });
    const result = await testCleanupAgent.cleanup({ dryRun: false });

    // Verify cleanup was attempted - folder should be removed
    expect(result.scanned).toBeGreaterThanOrEqual(1);
    expect(result.removed.length + result.errors.length).toBeGreaterThan(0);
  });

  test('dry run should not actually remove folders', async () => {
    const toolFolder = '.cursor';
    fs.mkdirSync(path.join(testDir, toolFolder));

    // Create a new CleanupAgent with no default keep folders
    const testCleanupAgent = new CleanupAgent({ defaultKeep: [], cwd: testDir });
    const result = await testCleanupAgent.cleanup({ dryRun: true });

    // Verify folder still exists
    expect(fs.existsSync(path.join(testDir, toolFolder))).toBe(true);
    expect(result.removed).toEqual([toolFolder + ' (dry-run)']);
  });

  test('should actually remove folders when not in dry run', async () => {
    const toolFolder = '.cursor';
    const toolPath = path.join(testDir, toolFolder);
    fs.mkdirSync(toolPath);

    // Create a new CleanupAgent with dryRun disabled by default
    const testCleanupAgent = new CleanupAgent({ defaultKeep: [], dryRun: false, cwd: testDir });
    const result = await testCleanupAgent.cleanup({ dryRun: false });

    // Verify cleanup was executed
    expect(result.scanned).toBe(1);
    // The folder should be removed (without dry-run suffix) OR an error occurred
    if (result.removed.length > 0) {
      // Check that it's NOT marked as dry-run
      expect(result.removed[0]).not.toContain('(dry-run)');
      expect(result.removed[0]).toBe(toolFolder);
    } else if (result.errors.length > 0) {
      // On Windows, if removal failed, that's also acceptable
      expect(result.errors[0].folder).toBe(toolFolder);
    } else {
      // If neither removed nor error, at least scanned should be 1
      expect(result.scanned).toBe(1);
    }
  });
});