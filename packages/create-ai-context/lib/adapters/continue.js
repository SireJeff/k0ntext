/**
 * Continue Adapter
 *
 * Generates .continue/config.json file for Continue extension
 */

const fs = require('fs');
const path = require('path');
const { renderTemplateByName, buildContext } = require('../template-renderer');
const { isManagedFile } = require('../template-coordination');

/**
 * Adapter metadata
 */
const adapter = {
  name: 'continue',
  displayName: 'Continue',
  description: 'Configuration file for Continue VS Code/JetBrains extension',
  outputType: 'single-file',
  outputPath: '.continue/config.json'
};

/**
 * Get output path for Continue config file
 * @param {string} projectRoot - Project root directory
 * @returns {string} Output file path
 */
function getOutputPath(projectRoot) {
  return path.join(projectRoot, '.continue', 'config.json');
}

/**
 * Check if Continue output already exists
 * @param {string} projectRoot - Project root directory
 * @returns {boolean}
 */
function exists(projectRoot) {
  const configPath = getOutputPath(projectRoot);
  const continueDir = path.join(projectRoot, '.continue');
  return fs.existsSync(configPath) || fs.existsSync(continueDir);
}

/**
 * Generate Continue config file
 * @param {object} analysis - Analysis results from static analyzer
 * @param {object} config - Configuration from CLI
 * @param {string} projectRoot - Project root directory
 * @returns {object} Generation result
 */
async function generate(analysis, config, projectRoot) {
  const result = {
    success: false,
    adapter: adapter.name,
    files: [],
    errors: []
  };

  try {
    const configPath = getOutputPath(projectRoot);

    // Check if file exists and is custom (not managed by us)
    if (fs.existsSync(configPath) && !config.force) {
      if (!isManagedFile(configPath)) {
        result.errors.push({
          message: '.continue/config.json exists and appears to be custom. Use --force to overwrite.',
          code: 'EXISTS_CUSTOM',
          severity: 'error'
        });
        return result;
      }
    }

    // Build context from analysis
    const context = buildContext(analysis, config, 'continue');

    // Render template
    const content = renderTemplateByName('continue-config', context);

    // Create .continue directory if it doesn't exist
    const continueDir = path.dirname(configPath);
    if (!fs.existsSync(continueDir)) {
      fs.mkdirSync(continueDir, { recursive: true });
    }

    // Write output file
    fs.writeFileSync(configPath, content, 'utf-8');

    result.success = true;
    result.files.push({
      path: configPath,
      relativePath: '.continue/config.json',
      size: content.length
    });
  } catch (error) {
    result.errors.push({
      message: error.message,
      stack: error.stack
    });
  }

  return result;
}

/**
 * Validate Continue output
 * @param {string} projectRoot - Project root directory
 * @returns {object} Validation result
 */
function validate(projectRoot) {
  const issues = [];
  const configPath = getOutputPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    issues.push({ file: '.continue/config.json', error: 'not found' });
  } else {
    const content = fs.readFileSync(configPath, 'utf-8');
    const placeholderMatch = content.match(/\{\{[A-Z_]+\}\}/g);
    if (placeholderMatch && placeholderMatch.length > 0) {
      issues.push({
        file: '.continue/config.json',
        error: `Found ${placeholderMatch.length} unreplaced placeholders`
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity !== 'warning').length === 0,
    issues
  };
}

module.exports = {
  ...adapter,
  getOutputPath,
  exists,
  generate,
  validate
};
