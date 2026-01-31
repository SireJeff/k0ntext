/**
 * Aider Adapter Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const aiderAdapter = require('../../../lib/adapters/aider');

describe('Aider Adapter', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aider-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should have correct adapter name', () => {
      expect(aiderAdapter.name).toBe('aider');
    });

    it('should have correct display name', () => {
      expect(aiderAdapter.displayName).toBe('Aider');
    });

    it('should have correct output path', () => {
      expect(aiderAdapter.outputPath).toBe('.aider.conf.yml');
    });

    it('should have single-file output type', () => {
      expect(aiderAdapter.outputType).toBe('single-file');
    });
  });

  describe('getOutputPath()', () => {
    it('should return path to .aider.conf.yml', () => {
      const outputPath = aiderAdapter.getOutputPath(tempDir);
      expect(outputPath).toContain('.aider.conf.yml');
    });
  });

  describe('exists()', () => {
    it('should return false when config file does not exist', () => {
      expect(aiderAdapter.exists(tempDir)).toBe(false);
    });

    it('should return true when .aider.conf.yml exists', () => {
      const configPath = path.join(tempDir, '.aider.conf.yml');
      fs.writeFileSync(configPath, '# Aider config');
      expect(aiderAdapter.exists(tempDir)).toBe(true);
    });
  });

  describe('generate()', () => {
    const mockAnalysis = {
      techStack: { languages: ['Python', 'FastAPI'] },
      entryPoints: [],
      workflows: [],
      architecture: {}
    };

    const mockConfig = {
      projectName: 'test-project',
      verbose: false
    };

    it('should generate .aider.conf.yml', async () => {
      const result = await aiderAdapter.generate(mockAnalysis, mockConfig, tempDir);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe('.aider.conf.yml');
    });

    it('should include project information in generated file', async () => {
      await aiderAdapter.generate(mockAnalysis, mockConfig, tempDir);

      const configPath = aiderAdapter.getOutputPath(tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('test-project');
      expect(content).toContain('Python');
    });

    it('should return EXISTS_CUSTOM error when custom file exists and force is false', async () => {
      const configPath = path.join(tempDir, '.aider.conf.yml');
      fs.writeFileSync(configPath, '# Custom config');

      const result = await aiderAdapter.generate(mockAnalysis, mockConfig, tempDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EXISTS_CUSTOM');
    });

    it('should regenerate when force is true', async () => {
      const configPath = path.join(tempDir, '.aider.conf.yml');
      fs.writeFileSync(configPath, '# Old config');

      const result = await aiderAdapter.generate(mockAnalysis, { ...mockConfig, force: true }, tempDir);

      expect(result.success).toBe(true);
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('test-project');
      expect(content).not.toContain('# Old config');
    });
  });

  describe('validate()', () => {
    it('should return valid when .aider.conf.yml exists with no placeholders', () => {
      const configPath = path.join(tempDir, '.aider.conf.yml');
      fs.writeFileSync(configPath, '# Valid config\nmodel: gpt-4');

      const validation = aiderAdapter.validate(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should return invalid when .aider.conf.yml does not exist', () => {
      const validation = aiderAdapter.validate(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].file).toBe('.aider.conf.yml');
      expect(validation.issues[0].error).toContain('not found');
    });

    it('should return invalid when .aider.conf.yml contains placeholders', () => {
      const configPath = path.join(tempDir, '.aider.conf.yml');
      fs.writeFileSync(configPath, '# Config with {{PLACEHOLDER}}');

      const validation = aiderAdapter.validate(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].error).toContain('1 unreplaced placeholder');
    });
  });
});
