/**
 * Configuration UI Panel
 *
 * Visual configuration management for k0ntext settings
 */

import fs from 'fs';
import path from 'path';
import { K0NTEXT_THEME } from '../theme.js';
import { input, confirm, select, checkbox } from '@inquirer/prompts';

/**
 * Config category
 */
interface ConfigCategory {
  name: string;
  description: string;
  keys: ConfigKey[];
}

/**
 * Config key definition
 */
interface ConfigKey {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  options?: string[];
  validate?: (value: string) => boolean | string;
  defaultValue?: unknown;
}

/**
 * All configuration definitions
 */
const CONFIG_DEFINITIONS: Record<string, ConfigCategory> = {
  'Project': {
    name: 'Project',
    description: 'Project-specific settings',
    keys: [
      {
        name: 'projectType',
        type: 'string',
        description: 'Type of project (monorepo, webapp, library, api, cli)',
        options: ['monorepo', 'webapp', 'library', 'api', 'cli', 'unknown'],
        defaultValue: 'unknown'
      },
      {
        name: 'maxFilesPerIndex',
        type: 'number',
        description: 'Maximum code files to index per module (batch indexing)',
        defaultValue: 500
      },
      {
        name: 'indexBatchSize',
        type: 'number',
        description: 'Files per batch during indexing',
        defaultValue: 100
      }
    ]
  },
  'AI Tools': {
    name: 'AI Tools',
    description: 'AI coding assistant configuration',
    keys: [
      {
        name: 'aiTools',
        type: 'array',
        description: 'Enabled AI tools',
        options: ['claude', 'copilot', 'cline', 'cursor', 'windsurf', 'aider', 'continue', 'gemini'],
        defaultValue: ['claude']
      },
      {
        name: 'openrouterKey',
        type: 'string',
        description: 'OpenRouter API key for intelligent analysis',
        validate: (value) => value.startsWith('sk-or-v1-') || value === '',
        defaultValue: ''
      },
      {
        name: 'generateEmbeddings',
        type: 'boolean',
        description: 'Automatically generate embeddings during indexing',
        defaultValue: true
      }
    ]
  },
  'Features': {
    name: 'Features',
    description: 'Enabled k0ntext features',
    keys: [
      {
        name: 'features',
        type: 'array',
        description: 'Enabled features',
        options: ['stats', 'search', 'docs', 'drift', 'workflows', 'mcp'],
        defaultValue: ['stats', 'search']
      },
      {
        name: 'autoUpdate',
        type: 'boolean',
        description: 'Check for updates on startup',
        defaultValue: true
      },
      {
        name: 'updateCheckInterval',
        type: 'number',
        description: 'Update check interval (hours)',
        defaultValue: 24
      }
    ]
  },
  'Display': {
    name: 'Display',
    description: 'UI and theme settings',
    keys: [
      {
        name: 'theme',
        type: 'string',
        description: 'Color theme',
        options: ['default', 'dark', 'light', 'high-contrast'],
        defaultValue: 'default'
      },
      {
        name: 'showTimestamps',
        type: 'boolean',
        description: 'Show timestamps in command output',
        defaultValue: true
      },
      {
        name: 'compactMode',
        type: 'boolean',
        description: 'Use compact output for large result sets',
        defaultValue: false
      }
    ]
  }
};

/**
 * Configuration UI Panel
 */
export class ConfigPanel {
  private projectRoot: string;
  private configPath: string;
  private sessionConfig: Record<string, unknown>;

  constructor(projectRoot: string, sessionConfig: Record<string, unknown>) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.k0ntext', 'config.json');
    this.sessionConfig = sessionConfig;
  }

  /**
   * Display current configuration
   */
  displayConfig(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(K0NTEXT_THEME.header('━━━ Configuration ━━━'));
    lines.push('');

    // Group by category
    for (const [categoryId, category] of Object.entries(CONFIG_DEFINITIONS)) {
      lines.push(`  ${K0NTEXT_THEME.header(category.name)} - ${K0NTEXT_THEME.dim(category.description)}`);
      lines.push('');

      for (const key of category.keys) {
        const value = this.getValue(key.name);
        const displayValue = this.formatValue(value, key);

        lines.push(`    ${K0NTEXT_THEME.cyan(key.name.padEnd(25))} ${displayValue}`);
        lines.push(`    ${K0NTEXT_THEME.dim(key.description)}`);
        lines.push('');
      }
    }

    lines.push(`  ${K0NTEXT_THEME.dim('Config file:')} ${this.configPath}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Interactive configuration editor
   */
  async interactiveConfig(category?: string): Promise<void> {
    const targetCategory = category || await this.selectCategory();

    if (!targetCategory) {
      return; // User cancelled
    }

    const configDef = CONFIG_DEFINITIONS[targetCategory];
    if (!configDef) {
      return;
    }

    console.log('');
    console.log(K0NTEXT_THEME.info(`Editing ${configDef.name} settings...`));
    console.log('');

    for (const key of configDef.keys) {
      const newValue = await this.promptForKey(key);
      if (newValue !== undefined) {
        this.setValue(key.name, newValue);
        console.log(K0NTEXT_THEME.success(`✓ Set ${key.name} = ${this.formatValue(newValue, key)}`));
      }
    }

    await this.saveConfig();
    console.log('');
    console.log(K0NTEXT_THEME.success('✓ Configuration saved'));
  }

  /**
   * Select a category to edit
   */
  private async selectCategory(): Promise<string | undefined> {
    const choices = Object.entries(CONFIG_DEFINITIONS).map(([id, cat]) => ({
      name: `${cat.name} - ${cat.description}`,
      value: id
    }));

    const { configCategory } = this.sessionConfig as Record<string, any>;

    const result = await select({
      message: 'Select configuration category:',
      choices: [
        ...choices,
        { name: 'Cancel', value: 'cancel' }
      ],
      default: configCategory || choices[0]?.value
    });

    return result === 'cancel' ? undefined : result;
  }

  /**
   * Prompt user for a configuration value
   */
  private async promptForKey(key: ConfigKey): Promise<unknown> {
    const currentValue = this.getValue(key.name);

    switch (key.type) {
      case 'boolean':
        return await confirm({
          message: key.description,
          default: Boolean(currentValue || key.defaultValue)
        });

      case 'array':
        if (key.options) {
          const selected = await checkbox({
            message: key.description,
            choices: key.options.map(opt => ({
              name: opt,
              value: opt,
              checked: Array.isArray(currentValue) ? currentValue.includes(opt) : false
            }))
          });
          return selected.length > 0 ? selected : key.defaultValue;
        }
        return currentValue || key.defaultValue;

      case 'string':
        if (key.options) {
          return await select({
            message: key.description,
            choices: key.options.map(opt => ({ name: opt, value: opt })),
            default: currentValue || key.defaultValue
          });
        }

        if (key.name === 'openrouterKey') {
          const result = await input({
            message: key.description,
            default: String(currentValue || ''),
            validate: key.validate
          });
          return result;
        }

        return await input({
          message: key.description,
          default: String(currentValue || key.defaultValue || '')
        });

      case 'number': {
        const inputResult = await input({
          message: key.description,
          default: String(currentValue || key.defaultValue || ''),
          validate: (value) => {
            const num = Number(value);
            return !isNaN(num) && num >= 0;
          }
        });
        return Number(inputResult);
      }

      default:
        return currentValue;
    }
  }

  /**
   * Get a configuration value
   */
  getValue(name: string): unknown {
    // Check session config first
    if (name in this.sessionConfig) {
      return this.sessionConfig[name];
    }

    // Check file config
    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return fileConfig[name];
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Return default
    for (const category of Object.values(CONFIG_DEFINITIONS)) {
      for (const key of category.keys) {
        if (key.name === name) {
          return key.defaultValue;
        }
      }
    }

    return undefined;
  }

  /**
   * Set a configuration value
   */
  setValue(name: string, value: unknown): void {
    // Update session config
    this.sessionConfig[name] = value;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    const configDir = path.dirname(this.configPath);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Merge with existing config
    let existingConfig = {};
    if (fs.existsSync(this.configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      } catch {
        // Invalid JSON, start fresh
      }
    }

    const mergedConfig = { ...existingConfig, ...this.sessionConfig };
    fs.writeFileSync(this.configPath, JSON.stringify(mergedConfig, null, 2));
  }

  /**
   * Format a value for display
   */
  formatValue(value: unknown, key: ConfigKey): string {
    if (value === undefined || value === null) {
      return K0NTEXT_THEME.dim('(not set)');
    }

    switch (key.type) {
      case 'boolean':
        return value ? K0NTEXT_THEME.success('✓ enabled') : K0NTEXT_THEME.dim('○ disabled');
      case 'array':
        if (!Array.isArray(value)) return K0NTEXT_THEME.dim('(invalid)');
        if (value.length === 0) return K0NTEXT_THEME.dim('(none)');
        return K0NTEXT_THEME.cyan(value.join(', '));
      case 'number':
        return K0NTEXT_THEME.highlight(String(value));
      case 'string':
        if (key.name === 'openrouterKey' && value) {
          return String(value).slice(0, 8) + '...' + K0NTEXT_THEME.success('(set)');
        }
        return K0NTEXT_THEME.cyan(String(value));
      default:
        return String(value);
    }
  }

  /**
   * Show configuration help
   */
  showConfigHelp(): string {
    const lines = [
      '',
      K0NTEXT_THEME.header('━━━ Configuration Help ━━━'),
      '',
      '  Commands:',
      '    config                 Show all configuration',
      '    config list            Show all configuration (alias)',
      '    config get <key>       Get a specific value',
      '    config set <key> <val>  Set a value',
      '    config edit            Interactive configuration editor',
      '',
      '  Categories:',
      ...Object.entries(CONFIG_DEFINITIONS).map(([id, cat]) => `    ${id.padEnd(15)} - ${cat.description}`),
      '',
      '  Examples:',
      '    config get projectType',
      '    config set projectType monorepo',
      '    config edit Project',
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check API key if embeddings are enabled
    const generateEmbeddings = this.getValue('generateEmbeddings') === true;
    const apiKey = this.getValue('openrouterKey') || process.env.OPENROUTER_API_KEY;

    if (generateEmbeddings && !apiKey) {
      warnings.push('Embeddings are enabled but no API key is set');
    }

    // Validate numeric ranges
    const maxFiles = this.getValue('maxFilesPerIndex');
    if (typeof maxFiles === 'number' && (maxFiles < 100 || maxFiles > 10000)) {
      errors.push('maxFilesPerIndex should be between 100 and 10000');
    }

    const batchSize = this.getValue('indexBatchSize');
    if (typeof batchSize === 'number' && (batchSize < 10 || batchSize > 1000)) {
      errors.push('indexBatchSize should be between 10 and 1000');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
