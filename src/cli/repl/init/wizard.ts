/**
 * Init Wizard
 *
 * Interactive wizard for initializing k0ntext configuration
 */

import { input, confirm, select, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { ProjectType } from '../core/session.js';
import { K0NTEXT_THEME } from '../tui/theme.js';
import { stripBOM } from '../../../utils/encoding.js';

/**
 * Wizard configuration result
 */
export interface WizardConfig {
  apiKey: string;
  projectType: ProjectType;
  aiTools: string[];
  features: string[];
  generateEmbeddings: boolean;
}

/**
 * Project type options
 */
const PROJECT_TYPES: Array<{ value: ProjectType; name: string; description: string }> = [
  { value: 'monorepo', name: 'Monorepo', description: 'Multiple packages/services in one repository' },
  { value: 'webapp', name: 'Web Application', description: 'Frontend web application (React, Vue, etc.)' },
  { value: 'api', name: 'API/Backend', description: 'Backend API service' },
  { value: 'library', name: 'Library/Package', description: 'Reusable library or npm package' },
  { value: 'cli', name: 'CLI Tool', description: 'Command-line interface tool' },
  { value: 'unknown', name: 'Other', description: 'Other type of project' }
];

/**
 * AI tool options
 */
const AI_TOOLS = [
  { name: 'Claude Code', value: 'claude', description: 'Anthropic Claude with advanced reasoning' },
  { name: 'GitHub Copilot', value: 'copilot', description: 'GitHub AI-powered code completion' },
  { name: 'Cline', value: 'cline', description: 'Autonomous coding agent' },
  { name: 'Cursor', value: 'cursor', description: 'AI code editor with integrated AI' },
  { name: 'Windsurf', value: 'windsurf', description: 'AI-powered IDE with code understanding' },
  { name: 'Aider', value: 'aider', description: 'AI pair programming in terminal' },
  { name: 'Continue', value: 'continue', description: 'Open source AI autopilot' }
];

/**
 * Feature options
 */
const FEATURES = [
  { name: '📊 Statistics & Analytics', value: 'stats', description: 'Track code metrics and context usage' },
  { name: '🔍 Semantic Search', value: 'search', description: 'AI-powered code search with embeddings' },
  { name: '📝 Auto Documentation', value: 'docs', description: 'Generate documentation from code' },
  { name: '🔄 Drift Detection', value: 'drift', description: 'Detect when docs are out of sync with code' },
  { name: '🎯 Workflow Tracking', value: 'workflows', description: 'Track RPI workflows and tasks' },
  { name: '🤖 MCP Integration', value: 'mcp', description: 'Model Context Protocol server' }
];

/**
 * Init Wizard
 */
export class InitWizard {
  private projectRoot: string;
  private hasExistingKey: boolean;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    // Strip UTF-8 BOM from env var if present (Windows editors sometimes add this)
    const cleanKey = process.env.OPENROUTER_API_KEY ? stripBOM(process.env.OPENROUTER_API_KEY) : '';
    this.hasExistingKey = cleanKey.length > 0;
  }

  /**
   * Run the complete wizard
   */
  async run(): Promise<WizardConfig | null> {
    this.showWelcome();

    // Step 1: API Key
    const apiKey = await this.stepApiKey();
    if (!apiKey) {
      console.log(K0NTEXT_THEME.warning('\n⚠ Initialization cancelled.'));
      return null;
    }

    // Step 2: Project Type
    const projectType = await this.stepProjectType();

    // Step 3: AI Tools
    const aiTools = await this.stepAITools();

    // Step 4: Features
    const features = await this.stepFeatures();

    // Step 5: Embeddings
    const generateEmbeddings = await this.stepEmbeddings();

    // Show summary
    const config: WizardConfig = {
      apiKey,
      projectType,
      aiTools,
      features,
      generateEmbeddings
    };

    const confirmed = await this.showSummary(config);
    if (!confirmed) {
      console.log(K0NTEXT_THEME.warning('\n⚠ Initialization cancelled.'));
      return null;
    }

    return config;
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    console.log('');
    console.log(K0NTEXT_THEME.box(
      'K0NTEXT INITIALIZATION',
      `
Welcome to K0ntext! This wizard will help you set up
AI context engineering for your project.

You'll be asked a few questions to configure K0ntext
for your specific needs.
      `.trim(),
      'primary'
    ));
    console.log('');
  }

  /**
   * Step 1: API Key
   */
  private async stepApiKey(): Promise<string | null> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Step 1/5: OpenRouter API Key ━━━'));

    if (this.hasExistingKey) {
      console.log(K0NTEXT_THEME.success('\n✓ API key detected in OPENROUTER_API_KEY environment variable'));
      const useExisting = await confirm({
        message: 'Use existing API key?',
        default: true
      });

      if (useExisting) {
        // Strip UTF-8 BOM from env var if present (Windows editors sometimes add this)
        const envKey = process.env.OPENROUTER_API_KEY || '';
        return stripBOM(envKey);
      }
    }

    console.log('');
    console.log(K0NTEXT_THEME.info('OpenRouter API key enables intelligent analysis and embeddings.'));
    console.log(K0NTEXT_THEME.dim('Get your key at: https://openrouter.ai/keys'));

    const apiKey = await input({
      message: 'Enter your OpenRouter API key (or press Enter to skip):',
      validate: (value: string) => {
        if (!value) return true; // Allow skipping
        // Strip BOM before validation
        const cleanValue = stripBOM(value);
        if (cleanValue.startsWith('sk-or-v1-')) return true;
        return 'Invalid API key format. Should start with "sk-or-v1-"';
      }
    });

    if (!apiKey) {
      const skipAnyway = await confirm({
        message: 'Skip API key? You can add it later with "k0ntext config set apiKey"',
        default: false
      });

      if (!skipAnyway) {
        return null; // User wants to cancel
      }
    }

    // Strip BOM from user input before returning
    return stripBOM(apiKey || '');
  }

  /**
   * Step 2: Project Type
   */
  private async stepProjectType(): Promise<ProjectType> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Step 2/5: Project Type ━━━'));
    console.log('');

    const projectType = await select({
      message: 'What type of project is this?',
      choices: PROJECT_TYPES.map((t) => ({
        name: `${t.name} - ${K0NTEXT_THEME.dim(t.description)}`,
        value: t.value,
        description: t.description
      }))
    });

    return projectType as ProjectType;
  }

  /**
   * Step 3: AI Tools
   */
  private async stepAITools(): Promise<string[]> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Step 3/5: AI Tools ━━━'));
    console.log('');
    console.log(K0NTEXT_THEME.info('Select the AI coding assistants you want to configure:'));

    const tools = await checkbox({
      message: 'Select AI tools (use space to select, enter to continue):',
      choices: AI_TOOLS.map((t) => ({
        name: `${t.name} - ${K0NTEXT_THEME.dim(t.description)}`,
        value: t.value,
        checked: t.value === 'claude' // Default to Claude
      }))
    });

    return tools.length > 0 ? tools : ['claude']; // Default to claude if none selected
  }

  /**
   * Step 4: Features
   */
  private async stepFeatures(): Promise<string[]> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Step 4/5: Features ━━━'));
    console.log('');
    console.log(K0NTEXT_THEME.info('Select the features you want to enable:'));

    const features = await checkbox({
      message: 'Select features (use space to select, enter to continue):',
      choices: FEATURES.map((f) => ({
        name: `${f.name} - ${K0NTEXT_THEME.dim(f.description)}`,
        value: f.value,
        checked: ['stats', 'search', 'mcp'].includes(f.value) // Default to core features
      }))
    });

    return features.length > 0 ? features : ['stats', 'mcp'];
  }

  /**
   * Step 5: Embeddings
   */
  private async stepEmbeddings(): Promise<boolean> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Step 5/5: Embeddings ━━━'));
    console.log('');
    console.log(K0NTEXT_THEME.info('Generate semantic embeddings for AI-powered search?'));
    console.log(K0NTEXT_THEME.dim('This will take a few minutes but greatly improves search quality.'));

    const generate = await confirm({
      message: 'Generate embeddings now?',
      default: false
    });

    return generate;
  }

  /**
   * Show summary and confirm
   */
  private async showSummary(config: WizardConfig): Promise<boolean> {
    console.log('');
    console.log(K0NTEXT_THEME.header('\n━━━ Configuration Summary ━━━'));
    console.log('');

    const typeInfo = PROJECT_TYPES.find(t => t.value === config.projectType);
    console.log(`  ${K0NTEXT_THEME.primary('Project Type:')}  ${typeInfo?.name || config.projectType}`);
    console.log(`  ${K0NTEXT_THEME.primary('API Key:')}        ${config.apiKey ? '✓ Configured' : '○ Skipped'}`);
    console.log(`  ${K0NTEXT_THEME.primary('AI Tools:')}       ${config.aiTools.map(t => K0NTEXT_THEME.highlight(t)).join(', ')}`);
    console.log(`  ${K0NTEXT_THEME.primary('Features:')}       ${config.features.map(f => {
      const feat = FEATURES.find(ff => ff.value === f);
      return feat?.name.split(' ')[0] || f;
    }).join(', ')}`);
    console.log(`  ${K0NTEXT_THEME.primary('Embeddings:')}     ${config.generateEmbeddings ? '✓ Yes' : '○ Later'}`);
    console.log('');

    return await confirm({
      message: 'Initialize K0ntext with these settings?',
      default: true
    });
  }

  /**
   * Show success message
   */
  showSuccess(config: WizardConfig): void {
    console.log('');
    console.log(K0NTEXT_THEME.success('\n✓ K0ntext initialized successfully!'));
    console.log('');

    console.log(K0NTEXT_THEME.header('Next Steps:'));
    console.log(`  ${K0NTEXT_THEME.cyan('•')} Type ${K0NTEXT_THEME.highlight('stats')} to view database statistics`);
    console.log(`  ${K0NTEXT_THEME.cyan('•')} Type ${K0NTEXT_THEME.highlight('index')} to index your codebase`);
    console.log(`  ${K0NTEXT_THEME.cyan('•')} Type ${K0NTEXT_THEME.highlight('search <query>')} to search your code`);
    console.log(`  ${K0NTEXT_THEME.cyan('•')} Type ${K0NTEXT_THEME.highlight('help')} for all available commands`);
    console.log('');
  }
}
