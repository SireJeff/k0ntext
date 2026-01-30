/**
 * Antigravity Adapter
 *
 * Generates .agent/ directory with multiple files for Google Antigravity.
 */

const fs = require('fs');
const path = require('path');
const { renderMultiFileTemplate, buildContext } = require('../template-renderer');
const { isManagedFile } = require('../template-coordination');

/**
 * Adapter metadata
 */
const adapter = {
  name: 'antigravity',
  displayName: 'Antigravity',
  description: 'Multi-file context for Google Antigravity',
  outputType: 'multi-file',
  outputPath: '.agent/'
};

/**
 * Get output directory for Antigravity files
 * @param {string} projectRoot - Project root directory
 * @returns {string} Output directory path
 */
function getOutputPath(projectRoot) {
  return path.join(projectRoot, '.agent');
}

/**
 * Check if Antigravity output already exists
 * @param {string} projectRoot - Project root directory
 * @returns {boolean}
 */
function exists(projectRoot) {
  return fs.existsSync(getOutputPath(projectRoot));
}

/**
 * Generate Antigravity context files
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
    const outputDir = getOutputPath(projectRoot);

    // Check if .agent/ directory exists and contains custom files
    if (fs.existsSync(outputDir) && !config.force) {
      const hasCustomFiles = checkForCustomFiles(outputDir);
      if (hasCustomFiles) {
        result.errors.push({
          message: '.agent/ directory exists and contains custom files. Use --force to overwrite.',
          code: 'EXISTS_CUSTOM',
          severity: 'error'
        });
        return result;
      }
    }

    // Build context from analysis
    const context = buildContext(analysis, config, 'antigravity');

    // Get template path
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'handlebars', 'antigravity.hbs');

    // Render multi-file template
    const files = renderMultiFileTemplate(templatePath, context);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each file
    for (const file of files) {
      const filePath = path.join(outputDir, file.filename);
      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, file.content, 'utf-8');

      result.files.push({
        path: filePath,
        relativePath: `.agent/${file.filename}`,
        size: file.content.length
      });
    }

    result.success = true;
  } catch (error) {
    result.errors.push({
      message: error.message,
      stack: error.stack
    });
  }

  return result;
}

/**
 * Check if directory contains custom (non-managed) files
 * @param {string} dir - Directory to check
 * @returns {boolean} True if custom files found
 */
function checkForCustomFiles(dir) {
  const walkDir = (currentDir, depth = 0) => {
    if (depth > 10) return false;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          if (walkDir(path.join(currentDir, entry.name), depth + 1)) {
            return true;
          }
        }
      } else if (entry.name.endsWith('.md')) {
        const filePath = path.join(currentDir, entry.name);
        if (!isManagedFile(filePath)) {
          return true;
        }
      }
    }
    return false;
  };

  return walkDir(dir);
}

/**
 * Validate Antigravity output
 * @param {string} projectRoot - Project root directory
 * @returns {object} Validation result
 */
function validate(projectRoot) {
  const outputDir = getOutputPath(projectRoot);

  if (!fs.existsSync(outputDir)) {
    return {
      valid: false,
      error: '.agent/ directory not found'
    };
  }

  // Check for required subdirectories
  const requiredDirs = ['rules', 'workflows', 'skills'];
  const missingDirs = [];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(outputDir, dir))) {
      missingDirs.push(dir);
    }
  }

  if (missingDirs.length > 0) {
    return {
      valid: false,
      error: `Missing directories: ${missingDirs.join(', ')}`
    };
  }

  // Count files
  let fileCount = 0;
  const countFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        countFiles(path.join(dir, entry.name));
      } else {
        fileCount++;
      }
    }
  };
  countFiles(outputDir);

  return {
    valid: true,
    fileCount
  };
}

module.exports = {
  ...adapter,
  getOutputPath,
  exists,
  generate,
  validate
};
