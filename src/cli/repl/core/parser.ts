/**
 * REPL Command Parser
 *
 * Parses and executes commands in the REPL shell
 */

import { ProjectType } from './session.js';

/**
 * Parsed command
 */
export interface ParsedCommand {
  raw: string;
  name: string;
  args: string[];
  flags: Record<string, boolean | string>;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
}

/**
 * Command definition
 */
export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], flags: Record<string, boolean | string>) => Promise<CommandResult>;
  completions?: (args: string[]) => string[];
}

/**
 * REPL Command Parser
 */
export class REPLCommandParser {
  private commands: Map<string, CommandDefinition>;
  private aliases: Map<string, string>;

  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.registerDefaultCommands();
  }

  /**
   * Register a command
   */
  registerCommand(def: CommandDefinition): void {
    this.commands.set(def.name, def);

    // Register aliases
    if (def.aliases) {
      for (const alias of def.aliases) {
        this.aliases.set(alias, def.name);
      }
    }
  }

  /**
   * Unregister a command
   */
  unregisterCommand(name: string): void {
    const def = this.commands.get(name);
    if (def) {
      this.commands.delete(name);

      // Remove aliases
      if (def.aliases) {
        for (const alias of def.aliases) {
          this.aliases.delete(alias);
        }
      }
    }
  }

  /**
   * Parse a command string
   */
  parse(input: string): ParsedCommand | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // Split into parts, respecting quotes
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];

      if ((char === '"' || char === "'") && (i === 0 || trimmed[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    if (parts.length === 0) {
      return null;
    }

    // Parse flags
    const args: string[] = [];
    const flags: Record<string, boolean | string> = {};

    for (const part of parts.slice(1)) {
      if (part.startsWith('--')) {
        const flagParts = part.slice(2).split('=');
        const flagName = flagParts[0];
        if (flagParts.length > 1) {
          flags[flagName] = flagParts.slice(1).join('=');
        } else {
          flags[flagName] = true;
        }
      } else if (part.startsWith('-')) {
        flags[part.slice(1)] = true;
      } else {
        args.push(part);
      }
    }

    // Resolve command name (handle aliases)
    let name = parts[0].toLowerCase();
    if (this.aliases.has(name)) {
      name = this.aliases.get(name)!;
    }

    return {
      raw: trimmed,
      name,
      args,
      flags
    };
  }

  /**
   * Execute a parsed command
   */
  async execute(parsed: ParsedCommand): Promise<CommandResult> {
    const def = this.commands.get(parsed.name);

    if (!def) {
      return {
        success: false,
        error: `Unknown command: ${parsed.name}. Type 'help' for available commands.`
      };
    }

    try {
      return await def.handler(parsed.args, parsed.flags);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get command completions
   */
  getCompletions(input: string, cursor: number): string[] {
    const parsed = this.parse(input);
    if (!parsed) {
      return Array.from(this.commands.keys());
    }

    const def = this.commands.get(parsed.name);
    if (def && def.completions) {
      return def.completions(parsed.args);
    }

    return [];
  }

  /**
   * Get all command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get command definition
   */
  getCommand(name: string): CommandDefinition | undefined {
    // Resolve alias
    const resolvedName = this.aliases.get(name) || name;
    return this.commands.get(resolvedName);
  }

  /**
   * Get help text for a command
   */
  getHelp(name?: string): string {
    if (name) {
      const def = this.getCommand(name);
      if (!def) {
        return `Unknown command: ${name}`;
      }

      return `
${def.name} - ${def.description}

Usage:
  ${def.usage}

Examples:
${def.examples.map(e => `  ${e}`).join('\n')}
      `.trim();
    }

    // Show all commands
    const lines = [
      '\nAvailable Commands:',
      ''
    ];

    const categories = this.groupCommandsByCategory();

    for (const [category, commands] of Object.entries(categories)) {
      lines.push(`  ${category}:`);
      for (const cmd of commands) {
        const def = this.getCommand(cmd);
        if (def) {
          lines.push(`    ${cmd.padEnd(15)} - ${def.description}`);
        } else {
          lines.push(`    ${cmd.padEnd(15)} - (no description)`);
        }
      }
      lines.push('');
    }

    lines.push('  Use "help <command>" for more information on a specific command.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Group commands by category
   */
  private groupCommandsByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      'Core': ['help', 'exit', 'clear', 'config'],
      'Database': ['stats', 'index', 'search'],
      'Initialization': ['init', 'generate'],
      'Monitoring': ['watch', 'drift'],
      'MCP': ['mcp', 'sync']
    };

    // Add all commands to categories
    for (const name of this.getCommandNames()) {
      let categorized = false;
      for (const [_, cmds] of Object.entries(categories)) {
        if (cmds.includes(name)) {
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        if (!categories['Other']) {
          categories['Other'] = [];
        }
        categories['Other'].push(name);
      }
    }

    return categories;
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: 'help',
      aliases: ['?', 'h'],
      description: 'Show help information',
      usage: 'help [command]',
      examples: [
        'help',
        'help index',
        'help stats'
      ],
      handler: async (args) => {
        const commandName = args[0];
        return {
          success: true,
          output: this.getHelp(commandName)
        };
      }
    });

    // Exit command
    this.registerCommand({
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit the REPL shell',
      usage: 'exit',
      examples: ['exit', 'quit'],
      handler: async () => {
        return {
          success: true,
          output: 'Goodbye!'
        };
      }
    });

    // Clear command
    this.registerCommand({
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear the screen',
      usage: 'clear',
      examples: ['clear'],
      handler: async () => {
        console.clear();
        return {
          success: true,
          output: ''
        };
      }
    });

    // Config command
    this.registerCommand({
      name: 'config',
      description: 'Manage configuration',
      usage: 'config [get|set|list] [key] [value]',
      examples: [
        'config list',
        'config get projectType',
        'config set projectType webapp'
      ],
      handler: async (args) => {
        return {
          success: true,
          output: 'Config command - use get|set|list'
        };
      }
    });
  }
}
