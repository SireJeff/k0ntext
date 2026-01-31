/**
 * Aider Adapter
 *
 * Generates .aider.conf.yml file for Aider AI pair-programmer
 */

const fs = require('fs');
const path = require('path');
const { renderTemplateByName, buildContext } = require('../template-renderer');
const { isManagedFile } = require('../template-coordination');

/**
 * Adapter metadata
 */
const adapter = {
  name: 'aider',
  displayName: 'Aider',
  description: 'Configuration file for Aider AI pair-programmer',
  outputType: 'single-file',
  outputPath: '.aider.conf.yml'
};

/**
 * Get output path for Aider config file
 * @param {string} projectRoot - Project root directory
 * @returns {string} Output file path
 */
function getOutputPath(projectRoot) {
  return path.join(projectRoot, '.aider.conf.yml');
}

/**
 * Check if Aider output already exists
 * @param {string} projectRoot - Project root directory
 * @returns {boolean}
 */
function exists(projectRoot) {
  const configPath = getOutputPath(projectRoot);
  return fs.existsSync(configPath);
}

/**
 * Generate Aider config file
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
          message: '.aider.conf.yml exists and appears to be custom. Use --force to overwrite.',
          code: 'EXISTS_CUSTOM',
          severity: 'error'
        });
        return result;
      }
    }

    // Build context from analysis
    const context = buildContext(analysis, config, 'aider');

    // Render template
    const content = renderTemplateByName('aider-config', context);

    // Write output file
    fs.writeFileSync(configPath, content, 'utf-8');

    result.success = true;
    result.files.push({
      path: configPath,
      relativePath: '.aider.conf.yml',
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
 * Validate Aider output
 * @param {string} projectRoot - Project root directory
 * @returns {object} Validation result
 */
function validate(projectRoot) {
  const issues = [];
  const configPath = getOutputPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    issues.push({ file: '.aider.conf.yml', error: 'not found' });
  } else {
    const content = fs.readFileSync(configPath, 'utf-8');
    const placeholderMatch = content.match(/\{\{[A-Z_]+\}\}/g);
    if (placeholderMatch && placeholderMatch.length > 0) {
      issues.push({
        file: '.aider.conf.yml',
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
