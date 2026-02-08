/**
 * K0ntext REPL Shell
 *
 * Interactive shell for managing k0ntext context
 */

import readline from 'readline';
import { REPLSessionManager, ProjectType } from './core/session.js';
import { REPLCommandParser } from './core/parser.js';
import { InitWizard } from './init/wizard.js';
import { UpdateChecker } from './update/checker.js';
import { K0NTEXT_THEME, terminal } from './tui/theme.js';
import { createIntelligentAnalyzer } from '../../analyzer/intelligent-analyzer.js';
import { DatabaseClient } from '../../db/client.js';
import { hasOpenRouterKey } from '../../embeddings/openrouter.js';

/**
 * REPL options
 */
export interface REPLOptions {
  projectRoot: string;
  version: string;
  noTUI?: boolean;
}

/**
 * K0ntext REPL Shell
 */
export class REPLShell {
  private session: REPLSessionManager;
  private parser: REPLCommandParser;
  private updateChecker: UpdateChecker;
  private projectRoot: string;
  private version: string;
  private readline: readline.Interface;
  private isActive: boolean = false;
  private noTUI: boolean;

  constructor(options: REPLOptions) {
    this.projectRoot = options.projectRoot;
    this.version = options.version;
    this.noTUI = options.noTUI || false;

    this.session = new REPLSessionManager(this.projectRoot);
    this.parser = new REPLCommandParser();
    this.updateChecker = new UpdateChecker(options.version);

    // Create readline interface
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt()
    });

    this.setupEventHandlers();
    this.registerCommands();
  }

  /**
   * Get the command prompt
   */
  private getPrompt(): string {
    const isInit = this.session.isInitialized();
    const symbol = isInit ? '█' : '?';
    return K0NTEXT_THEME.primary(`k0ntext${symbol} `);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.readline.on('line', async (input) => {
      if (!this.isActive) return;

      const trimmed = input.trim();

      if (!trimmed) {
        this.readline.prompt();
        return;
      }

      // Handle exit commands
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        await this.stop();
        return;
      }

      // Parse and execute command
      const parsed = this.parser.parse(trimmed);
      if (parsed) {
        const startTime = Date.now();
        const result = await this.parser.execute(parsed);
        const duration = Date.now() - startTime;

        this.session.addCommand(trimmed, result.output, duration);

        if (result.output) {
          console.log('');
          console.log(result.output);
        }

        if (result.error) {
          console.log('');
          console.log(K0NTEXT_THEME.error(`✖ ${result.error}`));
        }
      } else {
        console.log(K0NTEXT_THEME.warning('\n⚠ Invalid command. Type "help" for available commands.'));
      }

      this.readline.prompt();
    });

    this.readline.on('SIGINT', async () => {
      console.log('');
      console.log(K0NTEXT_THEME.warning('\n⚠ Use "exit" to quit the REPL.'));
      this.readline.prompt();
    });

    this.readline.on('close', async () => {
      await this.stop();
    });
  }

  /**
   * Register REPL-specific commands
   */
  private registerCommands(): void {
    // Stats command
    this.parser.registerCommand({
      name: 'stats',
      description: 'Show database and session statistics',
      usage: 'stats',
      examples: ['stats'],
      handler: async () => {
        const db = new DatabaseClient(this.projectRoot);
        const dbStats = db.getStats();
        const sessionStats = this.session.getStats();
        const duration = this.session.getDuration();

        const output = [
          '',
          K0NTEXT_THEME.header('━━━ Database Statistics ━━━'),
          `  ${K0NTEXT_THEME.cyan('•')} Context Items:    ${dbStats.items}`,
          `  ${K0NTEXT_THEME.cyan('•')} Relations:         ${dbStats.relations}`,
          `  ${K0NTEXT_THEME.cyan('•')} Git Commits:       ${dbStats.commits}`,
          `  ${K0NTEXT_THEME.cyan('•')} Embeddings:        ${dbStats.embeddings}`,
          `  ${K0NTEXT_THEME.cyan('•')} Tool Configs:      ${dbStats.toolConfigs}`,
          `  ${K0NTEXT_THEME.cyan('•')} Database Path:     ${dbStats.path || '.k0ntext.db'}`,
          '',
          K0NTEXT_THEME.header('━━━ Session Statistics ━━━'),
          `  ${K0NTEXT_THEME.cyan('•')} Duration:          ${duration.human}`,
          `  ${K0NTEXT_THEME.cyan('•')} Commands Run:      ${sessionStats.commandsExecuted}`,
          `  ${K0NTEXT_THEME.cyan('•')} Searches:          ${sessionStats.searchesPerformed}`,
          `  ${K0NTEXT_THEME.cyan('•')} Files Indexed:     ${sessionStats.filesIndexed}`,
          `  ${K0NTEXT_THEME.cyan('•')} Embeddings:        ${sessionStats.embeddingsGenerated}`,
          ''
        ];

        db.close();

        return { success: true, output: output.join('\n') };
      }
    });

    // Index command
    this.parser.registerCommand({
      name: 'index',
      description: 'Index codebase into database',
      usage: 'index [options]',
      examples: ['index', 'index --code', 'index --all'],
      handler: async (args, flags) => {
        const analyzer = createIntelligentAnalyzer(this.projectRoot);
        const db = new DatabaseClient(this.projectRoot);

        let indexedCount = 0;

        try {
          const [docs, code, tools] = await Promise.all([
            analyzer.discoverDocs(),
            analyzer.discoverCode(),
            analyzer.discoverToolConfigs()
          ]);

          const docsCount = docs.length;
          const codeCount = Math.min(code.length, 500); // Limit for now
          const toolsCount = tools.length;

          // Index docs
          for (const doc of docs) {
            const content = require('fs').readFileSync(doc.path, 'utf-8').slice(0, 50000);
            db.upsertItem({
              type: 'doc',
              name: require('path').basename(doc.relativePath),
              content,
              filePath: doc.relativePath,
              metadata: { size: doc.size }
            });
            indexedCount++;
          }

          // Index code
          for (const codeFile of code.slice(0, 500)) {
            const content = require('fs').existsSync(codeFile.path)
              ? require('fs').readFileSync(codeFile.path, 'utf-8').slice(0, 20000)
              : '';
            if (content) {
              db.upsertItem({
                type: 'code',
                name: require('path').basename(codeFile.relativePath),
                content,
                filePath: codeFile.relativePath,
                metadata: { size: codeFile.size }
              });
              indexedCount++;
            }
          }

          // Index tools
          for (const tool of tools) {
            const content = require('fs').existsSync(tool.path)
              ? require('fs').readFileSync(tool.path, 'utf-8').slice(0, 50000)
              : '';
            if (content) {
              db.upsertItem({
                type: 'tool_config',
                name: `${tool.tool}:${require('path').basename(tool.relativePath)}`,
                content,
                filePath: tool.relativePath,
                metadata: { tool: tool.tool, size: tool.size }
              });
              indexedCount++;
            }
          }

          this.session.updateStats({
            filesIndexed: this.session.getStats().filesIndexed + indexedCount
          });

          const output = [
            '',
            K0NTEXT_THEME.success('✓ Indexing complete'),
            `  ${K0NTEXT_THEME.cyan('•')} Documents: ${docsCount}`,
            `  ${K0NTEXT_THEME.cyan('•')} Code Files: ${codeCount}`,
            `  ${K0NTEXT_THEME.cyan('•')} Tool Configs: ${toolsCount}`,
            `  ${K0NTEXT_THEME.cyan('•')} Total Indexed: ${indexedCount}`,
            ''
          ];

          db.close();

          return { success: true, output: output.join('\n') };
        } catch (error) {
          db.close();
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    });

    // Search command
    this.parser.registerCommand({
      name: 'search',
      description: 'Search indexed content',
      usage: 'search <query>',
      examples: ['search auth', 'search "user login"'],
      completions: () => [],
      handler: async (args) => {
        const query = args.join(' ');
        if (!query) {
          return {
            success: false,
            error: 'Please provide a search query'
          };
        }

        const db = new DatabaseClient(this.projectRoot);
        const results = db.searchText(query);

        this.session.updateStats({
          searchesPerformed: this.session.getStats().searchesPerformed + 1
        });

        if (results.length === 0) {
          db.close();
          return {
            success: true,
            output: K0NTEXT_THEME.dim('\nNo results found.')
          };
        }

        const output = [
          '',
          K0NTEXT_THEME.header(`━━━ Search Results: "${query}" ━━━`),
          ''
        ];

        for (let i = 0; i < Math.min(results.length, 10); i++) {
          const result = results[i];
          output.push(`  ${K0NTEXT_THEME.primary(`${i + 1}.`)} ${result.name} [${result.type}]`);
          if (result.filePath) {
            output.push(`     ${K0NTEXT_THEME.dim(result.filePath)}`);
          }
        }

        if (results.length > 10) {
          output.push(`  ${K0NTEXT_THEME.dim(`... and ${results.length - 10} more`)}`);
        }

        output.push('');

        db.close();

        return { success: true, output: output.join('\n') };
      }
    });

    // Init command (re-run wizard)
    this.parser.registerCommand({
      name: 'init',
      description: 'Re-run initialization wizard',
      usage: 'init',
      examples: ['init'],
      handler: async () => {
        const wizard = new InitWizard(this.projectRoot);
        const config = await wizard.run();

        if (config) {
          this.session.setInitialized(config.apiKey, config.projectType);
          this.session.updateConfig({
            apiKey: config.apiKey,
            projectType: config.projectType,
            aiTools: config.aiTools,
            features: config.features
          });

          wizard.showSuccess(config);
        }

        return { success: true };
      }
    });

    // Update command
    this.parser.registerCommand({
      name: 'update',
      description: 'Check for k0ntext updates',
      usage: 'update',
      examples: ['update'],
      handler: async () => {
        const hasUpdate = await this.updateChecker.checkAndPrompt();
        return {
          success: true,
          output: hasUpdate ? '' : K0NTEXT_THEME.success('\n✓ Already on latest version')
        };
      }
    });

    // Drift command
    this.parser.registerCommand({
      name: 'drift',
      description: 'Check for documentation drift',
      usage: 'drift',
      examples: ['drift'],
      handler: async () => {
        const db = new DatabaseClient(this.projectRoot);
        const items = db.getAllItems();

        const now = new Date();
        const driftDays = 7;
        const driftThreshold = new Date(now.getTime() - driftDays * 24 * 60 * 60 * 1000);

        const drifted = items.filter(item => {
          if (!item.updatedAt) return false;
          const updated = new Date(item.updatedAt);
          return updated < driftThreshold;
        });

        db.close();

        const output = [
          '',
          K0NTEXT_THEME.header('━━━ Documentation Drift Check ━━━'),
          ''
        ];

        if (drifted.length === 0) {
          output.push(K0NTEXT_THEME.success('✓ All context files are up to date'));
        } else {
          output.push(K0NTEXT_THEME.warning(`⚠ Found ${drifted.length} files that may be out of sync:`));
          output.push('');

          for (const item of drifted.slice(0, 10)) {
            output.push(`  ${K0NTEXT_THEME.primary('•')} ${item.name} ${K0NTEXT_THEME.dim(`(${item.updatedAt})`)}`);
          }

          if (drifted.length > 10) {
            output.push(`  ${K0NTEXT_THEME.dim(`... and ${drifted.length - 10} more`)}`);
          }

          output.push('');
          output.push(K0NTEXT_THEME.info('Run "index" to update your context.'));
        }

        output.push('');

        return { success: true, output: output.join('\n') };
      }
    });

    // Config command
    this.parser.registerCommand({
      name: 'config',
      description: 'View or set configuration',
      usage: 'config [get|set|list] [key] [value]',
      examples: ['config list', 'config get projectType', 'config set projectType webapp'],
      handler: async (args) => {
        const action = args[0] || 'list';
        const state = this.session.getState();

        if (action === 'list') {
          const output = [
            '',
            K0NTEXT_THEME.header('━━━ Configuration ━━━'),
            '',
            `  ${K0NTEXT_THEME.cyan('projectType:')}  ${state.config.projectType || 'not set'}`,
            `  ${K0NTEXT_THEME.cyan('apiKey:')}       ${state.config.apiKey ? '✓ set' : '○ not set'}`,
            `  ${K0NTEXT_THEME.cyan('aiTools:')}       ${state.config.aiTools.join(', ') || 'none'}`,
            `  ${K0NTEXT_THEME.cyan('features:')}      ${state.config.features.join(', ') || 'none'}`,
            `  ${K0NTEXT_THEME.cyan('autoUpdate:')}   ${state.config.autoUpdate}`,
            ''
          ];
          return { success: true, output: output.join('\n') };
        }

        if (action === 'get') {
          const key = args[1];
          if (!key) return { success: false, error: 'Please specify a key' };
          const value = (state.config as any)[key];
          return { success: true, output: `${key}: ${value || 'not set'}` };
        }

        if (action === 'set') {
          const key = args[1];
          const value = args.slice(2).join(' ');
          if (!key || !value) return { success: false, error: 'Usage: config set <key> <value>' };

          this.session.updateConfig({ [key]: value });
          return { success: true, output: K0NTEXT_THEME.success(`✓ Set ${key} = ${value}`) };
        }

        return { success: false, error: 'Unknown action. Use: get, set, or list' };
      }
    });
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    this.isActive = true;

    // Show banner
    this.showBanner();

    // Check for updates
    if (this.session.getState().config.autoUpdate) {
      await this.updateChecker.showNotification({ showIfCurrent: false, checkInterval: 24 * 60 * 60 * 1000 });
    }

    // Check if initialized
    if (!this.session.isInitialized()) {
      console.log('');
      console.log(K0NTEXT_THEME.info('🔧 First-time setup detected. Running initialization wizard...\n'));

      const wizard = new InitWizard(this.projectRoot);
      const config = await wizard.run();

      if (config) {
        this.session.setInitialized(config.apiKey, config.projectType);
        this.session.updateConfig({
          apiKey: config.apiKey,
          projectType: config.projectType,
          aiTools: config.aiTools,
          features: config.features
        });

        wizard.showSuccess(config);
      } else {
        console.log(K0NTEXT_THEME.info('\n✓ Skipping initialization. You can run "init" later.\n'));
      }
    }

    // Show project stats if initialized
    if (this.session.isInitialized()) {
      const analyzer = createIntelligentAnalyzer(this.projectRoot);
      const analysis = await analyzer.analyze();

      console.log('');
      console.log(K0NTEXT_THEME.header('━━━ Project Overview ━━━'));
      console.log(`  ${K0NTEXT_THEME.primary('Type:')}     ${this.session.getState().config.projectType}`);
      console.log(`  ${K0NTEXT_THEME.primary('Docs:')}    ${analysis.existingContext.files.filter(f => f.type === 'doc').length}`);
      console.log(`  ${K0NTEXT_THEME.primary('Code:')}    ${analysis.existingContext.files.filter(f => f.type === 'code').length}`);
      console.log(`  ${K0NTEXT_THEME.primary('Tech:')}    ${analysis.techStack.languages.slice(0, 3).join(', ')}`);
    }

    console.log('');
    console.log(K0NTEXT_THEME.dim('Type "help" for available commands, "exit" to quit.'));

    // Start readline
    this.readline.prompt();
  }

  /**
   * Stop the REPL
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.session.end();
    this.readline.close();
    console.log('');
    console.log(K0NTEXT_THEME.success('✓ Session saved. Goodbye!'));
  }

  /**
   * Show welcome banner
   */
  private showBanner(): void {
    const { supportsColor } = K0NTEXT_THEME.detectCapabilities();

    if (!supportsColor) {
      console.log(`\n  K0ntext v${this.version}\n`);
      return;
    }

    console.log('');
    console.log(K0NTEXT_THEME.box(
      `K0NTEXT v${this.version}`,
      `${K0NTEXT_THEME.dim('Interactive shell for AI context engineering')}
${K0NTEXT_THEME.dim('Type "help" for commands, "exit" to quit')}`,
      'primary'
    ));
    console.log('');
  }
}

/**
 * Create and start a REPL shell
 */
export async function startREPL(projectRoot: string = process.cwd(), version: string, noTUI = false): Promise<void> {
  const shell = new REPLShell({ projectRoot, version, noTUI });
  await shell.start();
}
