/**
 * Continue Adapter Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const continueAdapter = require('../../../lib/adapters/continue');

describe('Continue Adapter', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'continue-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should have correct adapter name', () => {
      expect(continueAdapter.name).toBe('continue');
    });

    it('should have correct display name', () => {
      expect(continueAdapter.displayName).toBe('Continue');
    });

    it('should have correct output path', () => {
      expect(continueAdapter.outputPath).toBe('.continue/config.json');
    });

    it('should have single-file output type', () => {
      expect(continueAdapter.outputType).toBe('single-file');
    });
  });

  describe('getOutputPath()', () => {
    it('should return path to .continue/config.json', () => {
      const outputPath = continueAdapter.getOutputPath(tempDir);
      expect(outputPath).toContain('.continue');
      expect(outputPath).toContain('config.json');
    });
  });

  describe('exists()', () => {
    it('should return false when neither file nor directory exists', () => {
      expect(continueAdapter.exists(tempDir)).toBe(false);
    });

    it('should return true when .continue/config.json exists', () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      fs.writeFileSync(path.join(continueDir, 'config.json'), '{}');
      expect(continueAdapter.exists(tempDir)).toBe(true);
    });

    it('should return true when .continue/ directory exists (even without config.json)', () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      expect(continueAdapter.exists(tempDir)).toBe(true);
    });
  });

  describe('generate()', () => {
    const mockAnalysis = {
      techStack: { languages: ['TypeScript', 'React'] },
      entryPoints: [],
      workflows: [],
      architecture: {}
    };

    const mockConfig = {
      projectName: 'test-project',
      verbose: false
    };

    it('should generate .continue/config.json', async () => {
      const result = await continueAdapter.generate(mockAnalysis, mockConfig, tempDir);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe('.continue/config.json');
    });

    it('should create .continue directory if it does not exist', async () => {
      await continueAdapter.generate(mockAnalysis, mockConfig, tempDir);

      const continueDir = path.join(tempDir, '.continue');
      expect(fs.existsSync(continueDir)).toBe(true);
    });

    it('should include project information in generated file', async () => {
      await continueAdapter.generate(mockAnalysis, mockConfig, tempDir);

      const configPath = continueAdapter.getOutputPath(tempDir);
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('test-project');
      expect(content).toContain('TypeScript');
    });

    it('should return EXISTS_CUSTOM error when custom file exists and force is false', async () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      const configPath = path.join(continueDir, 'config.json');
      fs.writeFileSync(configPath, '{"custom": true}');

      const result = await continueAdapter.generate(mockAnalysis, mockConfig, tempDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EXISTS_CUSTOM');
    });

    it('should regenerate when force is true', async () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      const configPath = path.join(continueDir, 'config.json');
      fs.writeFileSync(configPath, '{"old": true}');

      const result = await continueAdapter.generate(mockAnalysis, { ...mockConfig, force: true }, tempDir);

      expect(result.success).toBe(true);
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('test-project');
      expect(content).not.toContain('"old": true');
    });
  });

  describe('validate()', () => {
    it('should return valid when config.json exists with no placeholders', () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      const configPath = path.join(continueDir, 'config.json');
      fs.writeFileSync(configPath, '{"valid": true}');

      const validation = continueAdapter.validate(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should return invalid when config.json does not exist', () => {
      const validation = continueAdapter.validate(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].file).toBe('.continue/config.json');
      expect(validation.issues[0].error).toContain('not found');
    });

    it('should return invalid when config.json contains placeholders', () => {
      const continueDir = path.join(tempDir, '.continue');
      fs.mkdirSync(continueDir, { recursive: true });
      const configPath = path.join(continueDir, 'config.json');
      fs.writeFileSync(configPath, '{"value": "{{PLACEHOLDER}}"}');

      const validation = continueAdapter.validate(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].error).toContain('1 unreplaced placeholder');
    });
  });
});
