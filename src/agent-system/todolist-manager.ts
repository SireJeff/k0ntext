/**
 * Todo List Manager
 *
 * Manages persistent todo lists that survive context compactions.
 * Uses markdown file storage in .claude/todos/ directory.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { DatabaseClient } from '../db/client.js';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';

/**
 * Todo task
 */
export interface TodoTask {
  /** Unique task ID */
  id: string;
  /** Task title (imperative form) */
  subject: string;
  /** Detailed description */
  description?: string;
  /** Current status */
  status: TaskStatus;
  /** Tasks that must complete before this one */
  dependencies?: string[];
  /** Agent/person assigned to */
  assignedTo?: string;
  /** When task was created */
  createdAt: string;
  /** When task was last updated */
  updatedAt: string;
  /** When task was completed */
  completedAt?: string;
}

/**
 * Todo session
 */
export interface TodoSession {
  /** Unique session ID */
  id: string;
  /** Session name/title */
  name: string;
  /** Session status */
  status: 'active' | 'completed' | 'archived';
  /** Tasks in this session */
  tasks: TodoTask[];
  /** When session was created */
  createdAt: string;
  /** When session was last updated */
  updatedAt: string;
  /** Parent session ID if this is a continuation */
  parentSession?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Todo list manager options
 */
export interface TodoListManagerOptions {
  /** Base directory for todo storage */
  baseDir?: string;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Progress update callback
 */
export interface ProgressUpdate {
  sessionId: string;
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Todo List Manager
 *
 * Manages persistent todo lists stored in markdown files.
 */
export class TodoListManager {
  private db: DatabaseClient;
  private baseDir: string;
  private verbose: boolean;
  private readonly TODO_DIR = 'todos';
  private readonly ACTIVE_SUBDIR = 'active';
  private readonly COMPLETED_SUBDIR = 'completed';
  private readonly ARCHIVED_SUBDIR = 'archived';

  constructor(db: DatabaseClient, options: TodoListManagerOptions = {}) {
    this.db = db;
    this.baseDir = options.baseDir || path.join(process.cwd(), '.claude');
    this.verbose = options.verbose || false;
  }

  /**
   * Get todos directory path
   */
  private getTodosDir(): string {
    return path.join(this.baseDir, this.TODO_DIR);
  }

  /**
   * Get active todos directory path
   */
  private getActiveDir(): string {
    return path.join(this.getTodosDir(), this.ACTIVE_SUBDIR);
  }

  /**
   * Get completed todos directory path
   */
  private getCompletedDir(): string {
    return path.join(this.getTodosDir(), this.COMPLETED_SUBDIR);
  }

  /**
   * Get archived todos directory path
   */
  private getArchivedDir(): string {
    return path.join(this.getTodosDir(), this.ARCHIVED_SUBDIR);
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.getTodosDir(),
      this.getActiveDir(),
      this.getCompletedDir(),
      this.getArchivedDir()
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch {
        // Directory might already exist
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = crypto.randomBytes(4).toString('hex').substring(0, 8);
    return `sess-${date}-${random}`;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get current timestamp
   */
  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Create a new todo session
   *
   * @param name - Session name
   * @param tasks - Initial tasks (optional)
   * @returns Created session
   */
  async createSession(
    name: string,
    tasks: Array<Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt'>> = []
  ): Promise<TodoSession> {
    await this.ensureDirectories();

    const sessionId = this.generateSessionId();
    const now = this.now();

    const sessionTasks: TodoTask[] = tasks.map(task => ({
      ...task,
      id: this.generateTaskId(),
      createdAt: now,
      updatedAt: now
    }));

    const session: TodoSession = {
      id: sessionId,
      name,
      status: 'active',
      tasks: sessionTasks,
      createdAt: now,
      updatedAt: now
    };

    // Save to file
    await this.saveSession(session);

    // Store in database
    this.storeSessionInDatabase(session);

    if (this.verbose) {
      console.log(`Created session: ${sessionId} with ${tasks.length} tasks`);
    }

    return session;
  }

  /**
   * Get active session
   *
   * @returns Active session or null if none exists
   */
  async getActiveSession(): Promise<TodoSession | null> {
    await this.ensureDirectories();

    const files = await fs.readdir(this.getActiveDir());
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));

    if (mdFiles.length === 0) {
      return null;
    }

    // Get most recent session
    const latestFile = mdFiles.sort().reverse()[0];
    const content = await fs.readFile(path.join(this.getActiveDir(), latestFile), 'utf-8');
    return this.parseSession(content);
  }

  /**
   * Get session by ID
   *
   * @param sessionId - Session ID
   * @returns Session or null if not found
   */
  async getSession(sessionId: string): Promise<TodoSession | null> {
    // Try active directory first
    let sessionPath = path.join(this.getActiveDir(), `${sessionId}.md`);
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      return this.parseSession(content);
    } catch {
      // Try completed directory
    }

    sessionPath = path.join(this.getCompletedDir(), `${sessionId}.md`);
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      return this.parseSession(content);
    } catch {
      return null;
    }
  }

  /**
   * List all sessions
   *
   * @param status - Filter by status (optional)
   * @returns Array of sessions
   */
  async listSessions(status?: 'active' | 'completed' | 'archived'): Promise<TodoSession[]> {
    await this.ensureDirectories();

    const sessions: TodoSession[] = [];

    if (!status || status === 'active') {
      const activeFiles = await fs.readdir(this.getActiveDir());
      for (const file of activeFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(this.getActiveDir(), file), 'utf-8');
        sessions.push(this.parseSession(content));
      }
    }

    if (!status || status === 'completed') {
      const completedFiles = await fs.readdir(this.getCompletedDir());
      for (const file of completedFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(this.getCompletedDir(), file), 'utf-8');
        sessions.push(this.parseSession(content));
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update a task in the active session
   *
   * @param taskId - Task ID
   * @param updates - Fields to update
   * @returns Updated task or null if not found
   */
  async updateTask(taskId: string, updates: Partial<TodoTask>): Promise<TodoTask | null> {
    const session = await this.getActiveSession();
    if (!session) return null;

    const task = session.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const updatedTask = { ...task, ...updates, updatedAt: this.now() };
    if (updates.status === 'completed' && !task.completedAt) {
      updatedTask.completedAt = this.now();
    }

    session.tasks = session.tasks.map(t =>
      t.id === taskId ? updatedTask : t
    );
    session.updatedAt = this.now();

    await this.saveSession(session);
    this.storeSessionInDatabase(session);

    return updatedTask;
  }

  /**
   * Add a task to the active session
   *
   * @param task - Task to add (without id)
   * @returns Created task with ID
   */
  async addTask(task: Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoTask> {
    const session = await this.getActiveSession();
    if (!session) {
      // Create new session if none exists
      const newSession = await this.createSession('New Session', [task]);
      return newSession.tasks[0];
    }

    const newTask: TodoTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: this.now(),
      updatedAt: this.now()
    };

    session.tasks.push(newTask);
    session.updatedAt = this.now();

    await this.saveSession(session);
    this.storeSessionInDatabase(session);

    return newTask;
  }

  /**
   * Complete the active session
   *
   * @returns Completed session or null if no active session
   */
  async completeSession(): Promise<TodoSession | null> {
    const session = await this.getActiveSession();
    if (!session) return null;

    const now = this.now();
    session.status = 'completed';
    session.updatedAt = now;

    // Mark incomplete tasks as blocked
    session.tasks = session.tasks.map(t => {
      if (t.status !== 'completed') {
        return { ...t, status: 'blocked' as TaskStatus };
      }
      return t;
    });

    await this.saveSession(session);

    // Move from active to completed
    const activePath = path.join(this.getActiveDir(), `${session.id}.md`);
    const completedPath = path.join(this.getCompletedDir(), `${session.id}.md`);
    await fs.rename(activePath, completedPath);

    this.storeSessionInDatabase(session);

    return session;
  }

  /**
   * Archive a session
   *
   * @param sessionId - Session ID to archive
   * @returns True if archived successfully
   */
  async archiveSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    // Add to archive file
    const archiveDate = new Date().toISOString().split('T')[0];
    const archivePath = path.join(this.getArchivedDir(), `${archiveDate}.md`);
    const archiveContent = await this.generateArchiveContent(session);

    await fs.appendFile(archivePath, archiveContent + '\n\n---\n\n', 'utf-8');

    // Remove from completed
    const completedPath = path.join(this.getCompletedDir(), `${sessionId}.md`);
    await fs.unlink(completedPath);

    return true;
  }

  /**
   * Get progress for active session
   *
   * @returns Progress update or null if no active session
   */
  async getProgress(): Promise<ProgressUpdate | null> {
    const session = await this.getActiveSession();
    if (!session) return null;

    const total = session.tasks.length;
    const completed = session.tasks.filter(t => t.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      sessionId: session.id,
      total,
      completed,
      percentage
    };
  }

  /**
   * Save session to markdown file
   */
  private async saveSession(session: TodoSession): Promise<void> {
    const content = await this.generateSessionContent(session);
    const filePath = path.join(
      session.status === 'active' ? this.getActiveDir() : this.getCompletedDir(),
      `${session.id}.md`
    );
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Generate session markdown content
   */
  private async generateSessionContent(session: TodoSession): Promise<string> {
    const statusEmoji = {
      active: '🔄',
      completed: '✅',
      archived: '📦'
    };

    const taskEmoji = (status: TaskStatus) => {
      switch (status) {
        case 'pending': return '[ ]';
        case 'in-progress': return '[~]';
        case 'completed': return '[x]';
        case 'blocked': return '[-]';
        case 'cancelled': return '[✗]';
      }
    };

    let content = `# Session Todo: ${session.name}

**Session ID:** ${session.id}
**Created:** ${session.createdAt}
**Status:** ${session.status} ${statusEmoji[session.status]}

## Tasks

`;

    for (const task of session.tasks) {
      content += `${taskEmoji(task.status)} Task ${task.id.substring(0, 8)}: ${task.subject}\n`;
      if (task.description) {
        content += `  ${task.description}\n`;
      }
      if (task.dependencies && task.dependencies.length > 0) {
        content += `  Dependencies: ${task.dependencies.join(', ')}\n`;
      }
      content += '\n';
    }

    return content;
  }

  /**
   * Generate archive entry content
   */
  private async generateArchiveContent(session: TodoSession): Promise<string> {
    const total = session.tasks.length;
    const completed = session.tasks.filter(t => t.status === 'completed').length;
    const duration = new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime();
    const durationMinutes = Math.round(duration / 60000);

    return `## Session: ${session.name}

**Session ID:** ${session.id}
**Status:** Completed ✅
**Duration:** ${durationMinutes}m
**Tasks:** ${completed}/${total} completed (${Math.round((completed / total) * 100)}%)

**Summary:**
All tasks for "${session.name}" completed at ${session.updatedAt}.
`;
  }

  /**
   * Parse session from markdown content
   */
  private parseSession(content: string): TodoSession {
    const lines = content.split('\n');

    let id = '';
    let name = 'Unknown Session';
    let status: TodoSession['status'] = 'active';
    let createdAt = new Date().toISOString();
    let updatedAt = new Date().toISOString();

    const tasks: TodoTask[] = [];

    for (const line of lines) {
      // Parse session metadata
      const sessionMatch = line.match(/^\*\*Session ID:\s*(.+)$/);
      if (sessionMatch) id = sessionMatch[1];

      const nameMatch = line.match(/^#\s+Session Todo:\s*(.+)$/);
      if (nameMatch) name = nameMatch[1];

      const statusMatch = line.match(/^\*\*Status:\s*(\w+)\s/);
      if (statusMatch) {
        if (statusMatch[1].includes('active')) status = 'active';
        else if (statusMatch[1].includes('completed')) status = 'completed';
        else status = 'archived';
      }

      const createdMatch = line.match(/^\*\*Created:\s*(.+)$/);
      if (createdMatch) createdAt = createdMatch[1];

      // Parse tasks
      const taskMatch = line.match(/^[\[\~x\s\-\]]\s+Task\s+([a-f0-9]+):\s*(.+)$/);
      if (taskMatch) {
        const taskId = taskMatch[1];
        const subject = taskMatch[2];
        const taskStatus: TaskStatus = line.includes('[x]') ? 'completed' :
                                       line.includes('[~]') ? 'in-progress' :
                                       line.includes('[-]') ? 'blocked' :
                                       line.includes('[✗]') ? 'cancelled' :
                                       'pending';
        tasks.push({
          id: taskId,
          subject,
          status: taskStatus,
          createdAt,
          updatedAt
        });
      }
    }

    return {
      id,
      name,
      status,
      tasks,
      createdAt,
      updatedAt
    };
  }

  /**
   * Store session in database
   *
   * Uses todo_sessions and todo_tasks tables for efficient querying.
   */
  private storeSessionInDatabase(session: TodoSession): void {
    try {
      // Check if schema supports todo tables
      this.db.prepare(
        'INSERT OR REPLACE INTO todo_sessions (id, name, created_at, updated_at, parent_session, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(session.id, session.name, session.createdAt, session.updatedAt, session.parentSession, JSON.stringify(session.metadata || {}));

      // Store tasks
      for (const task of session.tasks) {
        this.db.prepare(
          'INSERT OR REPLACE INTO todo_tasks (id, session_id, subject, description, status, dependencies, assigned_to, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(task.id, session.id, task.subject, task.description || '', task.status,
                  JSON.stringify(task.dependencies || []), task.assignedTo || '',
                  task.createdAt, task.updatedAt, task.completedAt);
      }

      if (this.verbose) {
        console.log(`Stored session ${session.id} in database with ${session.tasks.length} tasks`);
      }
    } catch (error) {
      // Database might not have todo tables yet (migration 0016)
      if (this.verbose) {
        console.warn(`Could not store session in database: ${error}`);
      }
    }
  }

  /**
   * Get session from database
   *
   * @param sessionId - Session ID
   * @returns Session with tasks or null
   */
  private getSessionFromDatabase(sessionId: string): TodoSession | null {
    try {
      const sessionRow = this.db.prepare(
        'SELECT * FROM todo_sessions WHERE id = ?'
      ).get(sessionId) as Record<string, unknown> | undefined;

      if (!sessionRow) return null;

      const session = sessionRow;

      const tasksRows = this.db.prepare(
        'SELECT * FROM todo_tasks WHERE session_id = ? ORDER BY created_at ASC'
      ).all(sessionId) as unknown[];

      return {
        id: typeof session.id === 'string' ? session.id : sessionId,
        name: typeof session.name === 'string' ? session.name : 'Unknown',
        status: (typeof session.status === 'string' && ['active', 'completed', 'archived'].includes(session.status))
          ? session.status as TodoSession['status'] : 'active',
        createdAt: typeof session.created_at === 'string' ? session.created_at : new Date().toISOString(),
        updatedAt: typeof session.updated_at === 'string' ? session.updated_at : new Date().toISOString(),
        parentSession: typeof session.parent_session === 'string' ? session.parent_session : undefined,
        metadata: typeof session.metadata === 'string' ? JSON.parse(session.metadata) :
                     (session.metadata && typeof session.metadata === 'object') ? session.metadata as Record<string, unknown> : undefined,
        tasks: tasksRows.map((t: unknown) => {
          const task = t as Record<string, unknown>;
          return {
            id: typeof task.id === 'string' ? task.id : this.generateTaskId(),
            subject: typeof task.subject === 'string' ? task.subject : '',
            description: typeof task.description === 'string' ? task.description : undefined,
            status: (typeof task.status === 'string' && ['pending', 'in-progress', 'completed', 'blocked', 'cancelled'].includes(task.status))
              ? task.status as TodoTask['status'] : 'pending',
            dependencies: typeof task.dependencies === 'string' ? JSON.parse(task.dependencies) :
                           (task.dependencies && Array.isArray(task.dependencies)) ? task.dependencies as string[] : undefined,
            assignedTo: typeof task.assigned_to === 'string' ? task.assigned_to : undefined,
            createdAt: typeof task.created_at === 'string' ? task.created_at : new Date().toISOString(),
            updatedAt: typeof task.updated_at === 'string' ? task.updated_at : new Date().toISOString(),
            completedAt: typeof task.completed_at === 'string' ? task.completed_at : undefined
          };
        })
      };
    } catch (error) {
      if (this.verbose) {
        console.warn(`Could not read session from database: ${error}`);
      }
      return null;
    }
  }

  /**
   * Export session as markdown
   *
   * @param sessionId - Session ID
   * @returns Markdown content
   */
  async exportSession(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    return await this.generateSessionContent(session);
  }

  /**
   * Import tasks from markdown
   *
   * @param markdownContent - Markdown content
   * @returns Created session
   */
  async importTasks(markdownContent: string, sessionName?: string): Promise<TodoSession> {
    const imported = this.parseSession(markdownContent);
    const tasks = imported.tasks.map(t => ({
      subject: t.subject,
      description: t.description,
      status: t.status
    }));

    return await this.createSession(sessionName || 'Imported Session', tasks);
  }

  /**
   * Clean up old archived sessions
   *
   * @param daysOld - Remove archives older than this many days
   * @returns Number of archives removed
   */
  async cleanupOldArchives(daysOld: number = 30): Promise<number> {
    const archiveDir = this.getArchivedDir();
    const files = await fs.readdir(archiveDir);
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    let removed = 0;

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(archiveDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime.getTime() < cutoff) {
        await fs.unlink(filePath);
        removed++;
        if (this.verbose) {
          console.log(`Removed old archive: ${file}`);
        }
      }
    }

    return removed;
  }

  /**
   * Get all sessions for reporting
   *
   * @returns Summary of all sessions
   */
  async getSummary(): Promise<{
    active: number;
    completed: number;
    totalTasks: number;
    completedTasks: number;
  }> {
    const allSessions = await this.listSessions();

    const activeCount = allSessions.filter(s => s.status === 'active').length;
    const completedCount = allSessions.filter(s => s.status === 'completed').length;

    let totalTasks = 0;
    let completedTasks = 0;

    for (const session of allSessions) {
      totalTasks += session.tasks.length;
      completedTasks += session.tasks.filter(t => t.status === 'completed').length;
    }

    return {
      active: activeCount,
      completed: completedCount,
      totalTasks,
      completedTasks
    };
  }
}
