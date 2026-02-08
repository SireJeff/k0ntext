/**
 * REPL Session Manager
 *
 * Manages REPL session lifecycle, state persistence, and activity tracking
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Session state
 */
export interface SessionState {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  projectRoot: string;
  config: SessionConfig;
  history: CommandHistoryEntry[];
  stats: SessionStats;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  apiKey?: string;
  projectType?: ProjectType;
  aiTools: string[];
  features: string[];
  autoUpdate: boolean;
  theme: string;
}

/**
 * Project type
 */
export type ProjectType = 'monorepo' | 'webapp' | 'library' | 'api' | 'cli' | 'unknown';

/**
 * Command history entry
 */
export interface CommandHistoryEntry {
  command: string;
  timestamp: string;
  result?: string;
  duration?: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  commandsExecuted: number;
  searchesPerformed: number;
  filesIndexed: number;
  embeddingsGenerated: number;
  errorsEncountered: number;
}

/**
 * REPL Session Manager
 */
export class REPLSessionManager {
  private state: SessionState;
  private statePath: string;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    const k0ntextDir = path.join(projectRoot, '.k0ntext');
    this.statePath = path.join(k0ntextDir, 'session.json');

    // Ensure .k0ntext directory exists
    if (!fs.existsSync(k0ntextDir)) {
      fs.mkdirSync(k0ntextDir, { recursive: true });
    }

    // Try to load existing session or create new
    this.state = this.load() || this.createNewSession();
  }

  /**
   * Create a new session
   */
  private createNewSession(): SessionState {
    return {
      sessionId: generateUUID(),
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      projectRoot: this.projectRoot,
      config: {
        aiTools: [],
        autoUpdate: true,
        theme: 'default',
        features: []
      },
      history: [],
      stats: {
        commandsExecuted: 0,
        searchesPerformed: 0,
        filesIndexed: 0,
        embeddingsGenerated: 0,
        errorsEncountered: 0
      }
    };
  }

  /**
   * Load session from disk
   */
  private load(): SessionState | null {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content) as SessionState;
      }
    } catch {
      // If load fails, return null to create new session
    }
    return null;
  }

  /**
   * Save session to disk
   */
  save(): void {
    try {
      this.state.lastActivity = new Date().toISOString();
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Update session config
   */
  updateConfig(config: Partial<SessionConfig>): void {
    this.state.config = { ...this.state.config, ...config };
    this.save();
  }

  /**
   * Add command to history
   */
  addCommand(command: string, result?: string, duration?: number): void {
    const entry: CommandHistoryEntry = {
      command,
      timestamp: new Date().toISOString(),
      result,
      duration
    };

    this.state.history.push(entry);

    // Keep only last 100 commands
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-100);
    }

    this.state.stats.commandsExecuted++;
    this.save();
  }

  /**
   * Get command history
   */
  getHistory(limit?: number): CommandHistoryEntry[] {
    const history = this.state.history.slice().reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Update session stats
   */
  updateStats(stats: Partial<SessionStats>): void {
    this.state.stats = { ...this.state.stats, ...stats };
    this.save();
  }

  /**
   * Get session stats
   */
  getStats(): SessionStats {
    return { ...this.state.stats };
  }

  /**
   * Get session duration
   */
  getDuration(): { ms: number; human: string } {
    const start = new Date(this.state.startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let human = '';
    if (days > 0) human += `${days}d `;
    if (hours % 24 > 0) human += `${hours % 24}h `;
    if (minutes % 60 > 0) human += `${minutes % 60}m `;
    if (seconds % 60 > 0 || human === '') human += `${seconds % 60}s`;

    return { ms: diff, human: human.trim() };
  }

  /**
   * Check if session is initialized (has API key and project type)
   */
  isInitialized(): boolean {
    return !!(
      this.state.config.apiKey ||
      process.env.OPENROUTER_API_KEY
    ) && !!this.state.config.projectType;
  }

  /**
   * Set initialization status
   */
  setInitialized(apiKey: string, projectType: ProjectType): void {
    this.state.config.apiKey = apiKey;
    this.state.config.projectType = projectType;
    this.save();
  }

  /**
   * Get OpenRouter API key
   */
  getApiKey(): string | undefined {
    return this.state.config.apiKey || process.env.OPENROUTER_API_KEY;
  }

  /**
   * Clear session (for reset/reinit)
   */
  clear(): void {
    this.state = this.createNewSession();
    this.save();
  }

  /**
   * End session
   */
  end(): void {
    this.save();
  }
}
