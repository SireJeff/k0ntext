/**
 * Drift Detection Agent
 *
 * Uses AI to detect when documentation drifts from the actual codebase.
 * This is the core of intelligent drift detection for k0ntext v3.1.0.
 *
 * @version 3.1.0
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { OpenRouterClient } from '../embeddings/openrouter.js';
import { MODEL_CONFIG, getModelFor } from '../config/models.js';
import { parseAIResponse } from '../utils/ai-parser.js';

/**
 * A detected drift issue
 */
export interface DriftIssue {
  /** The file where drift was detected */
  file: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** What the documentation says */
  expected: string;
  /** What the actual codebase has */
  actual: string;
  /** Suggested fix (optional) */
  suggestion?: string;
  /** Line number where drift occurs (optional) */
  line?: number;
}

/**
 * Result of drift detection
 */
export interface DriftResult {
  /** All detected drifts */
  drifts: DriftIssue[];
  /** Number of drifts automatically fixed */
  fixed: number;
  /** Files checked */
  filesChecked: number;
  /** Time taken in milliseconds */
  duration: number;
  /** Files that failed due to authentication errors */
  authFailures?: string[];
  /** Files that failed due to other errors */
  errors?: Array<{ file: string; error: string }>;
}

/**
 * Configuration for the drift agent
 */
export interface DriftAgentConfig {
  /** OpenRouter client for AI analysis */
  openRouter: OpenRouterClient;
  /** Model override (not recommended) */
  model?: string;
  /** Whether to fail on any drift */
  strict?: boolean;
  /** Project root directory */
  projectRoot: string;
}

/**
 * Default ignore patterns for file discovery
 */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/vendor/**',
  '**/__pycache__/**',
  '**/target/**',
  '**/bin/**',
  '**/obj/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/*.min.js',
  '**/*.map',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml'
];

/**
 * Default context files to check for drift
 */
const DEFAULT_CONTEXT_FILES = [
  'CLAUDE.md',
  'CLAUDE.md.local',
  'AI_CONTEXT.md',
  '.github/copilot-instructions.md',
  '.clinerules',
  '.windsurf/rules.md',
  '.cursorrules',
  '.aider.conf.yml',
  '.continue/config.json',
  '.gemini/config.md',
  '.claude/context/**/*.md',
  '.claude/commands/**/*.md',
  'docs/**/*.md',
  'README.md'
];

/**
 * Drift Detection Agent
 *
 * Analyzes documentation files and compares them against the actual
 * codebase to detect discrepancies using AI semantic analysis.
 */
export class DriftAgent {
  private openRouter: OpenRouterClient;
  private model: string;
  private strict: boolean;
  private projectRoot: string;

  constructor(config: DriftAgentConfig) {
    this.openRouter = config.openRouter;
    this.model = config.model || getModelFor('DRIFT_DETECTION');
    this.strict = config.strict ?? false;
    this.projectRoot = config.projectRoot;
  }

  /**
   * Detect drift across all context files
   */
  async detectDrift(options: {
    paths?: string[];
    autoFix?: boolean;
    maxFiles?: number;
  }): Promise<DriftResult> {
    const startTime = Date.now();
    const drifts: DriftIssue[] = [];
    let fixed = 0;
    const authFailures: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    // Get list of files to check
    const filesToCheck = options.paths
      ? options.paths
      : await this.getContextFiles();

    // Limit files if specified
    const filesToProcess = options.maxFiles
      ? filesToCheck.slice(0, options.maxFiles)
      : filesToCheck;

    // Discover relevant source code for comparison
    const sourceFiles = await this.discoverSourceFiles();

    // Analyze each file for drift
    for (const relativePath of filesToProcess) {
      try {
        const drift = await this.checkFileForDrift(relativePath, sourceFiles);
        if (drift) {
          drifts.push(drift);

          if (options.autoFix && drift.suggestion) {
            const didFix = await this.fixDrift(relativePath, drift);
            if (didFix) fixed++;
          }
        }
      } catch (error) {
        // Check for authentication errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('401') ||
            errorMessage.includes('Authentication') ||
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('API key')) {
          authFailures.push(relativePath);
        } else {
          errors.push({ file: relativePath, error: errorMessage });
        }
        // Log error but continue
        console.error(`Failed to analyze ${relativePath}: ${errorMessage}`);
      }
    }

    return {
      drifts,
      fixed,
      filesChecked: filesToProcess.length,
      duration: Date.now() - startTime,
      authFailures,
      errors
    };
  }

  /**
   * Check a single file for drift
   */
  private async checkFileForDrift(
    relativePath: string,
    sourceFiles: string[]
  ): Promise<DriftIssue | null> {
    const fullPath = path.join(this.projectRoot, relativePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');

      // Get relevant source file samples for comparison
      const relevantSource = await this.getRelevantSourceSamples(
        relativePath,
        sourceFiles
      );

      // Use AI to analyze drift
      const analysis = await this.openRouter.chat([
        {
          role: 'system',
          content: this.getDriftDetectionPrompt()
        },
        {
          role: 'user',
          content: this.buildDriftAnalysisPrompt(relativePath, content, relevantSource)
        }
      ], {
        model: this.model,
        temperature: MODEL_CONFIG.ANALYSIS_TEMPERATURE,
        maxTokens: MODEL_CONFIG.DRIFT_MAX_TOKENS
      });

      // Parse JSON response
      const result = this.parseDriftResponse(analysis);

      if (result && result.hasDrift) {
        return {
          file: relativePath,
          severity: result.severity || 'medium',
          expected: result.expected || 'Documentation does not match current code',
          actual: result.actual || 'Code has changed',
          suggestion: result.suggestion,
          line: result.line
        };
      }

      return null;

    } catch (error) {
      // If analysis fails, log but don't fail the entire process
      console.error(`Failed to analyze ${relativePath}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Get the drift detection system prompt
   */
  private getDriftDetectionPrompt(): string {
    return `You are a drift detection expert for AI context engineering.

Your task is to analyze if documentation accurately reflects the current codebase state.

Look for these types of drift:
1. **File references** - Documentation mentions files that don't exist or have moved
2. **API signatures** - Function/method signatures that have changed
3. **Architecture changes** - Structural changes not reflected in docs
4. **Workflow changes** - Process changes not documented
5. **Configuration changes** - Settings/options that have changed

Respond with valid JSON only (no markdown formatting):
{
  "hasDrift": boolean,
  "severity": "low" | "medium" | "high",
  "expected": "what the documentation claims",
  "actual": "what the actual code has",
  "suggestion": "how to fix the documentation",
  "line": number (if applicable)
}

Severity guidelines:
- high: Breaking changes, missing files, incorrect API signatures
- medium: Changed workflows, outdated architecture descriptions
- low: Minor inconsistencies, outdated examples`;
  }

  /**
   * Build the drift analysis prompt for a specific file
   */
  private buildDriftAnalysisPrompt(
    docPath: string,
    docContent: string,
    sourceSamples: string[]
  ): string {
    let prompt = `Check for drift in: ${docPath}\n\n`;
    prompt += `## Documentation Content\n${docContent}\n\n`;

    if (sourceSamples.length > 0) {
      prompt += `## Relevant Source Code Samples\n`;
      prompt += `Use these to verify documentation accuracy:\n\n`;
      for (const sample of sourceSamples.slice(0, 5)) { // Limit to 5 samples
        prompt += `---\n${sample}\n---\n`;
      }
    }

    prompt += `\nAnalyze the documentation against the code samples and identify any discrepancies.`;

    return prompt;
  }

  /**
   * Parse the drift detection response
   */
  private parseDriftResponse(response: string): {
    hasDrift: boolean;
    severity?: 'low' | 'medium' | 'high';
    expected?: string;
    actual?: string;
    suggestion?: string;
    line?: number;
  } | null {
    return parseAIResponse(response);
  }

  /**
   * Get relevant source code samples for comparison
   */
  private async getRelevantSourceSamples(
    docPath: string,
    sourceFiles: string[]
  ): Promise<string[]> {
    const samples: string[] = [];
    const maxSampleSize = 2000; // bytes

    // Extract file references from doc path
    const docName = path.basename(docPath, '.md').toLowerCase();

    // Find related source files
    const relatedFiles = sourceFiles.filter(file => {
      const lowerFile = file.toLowerCase();
      // Files that might be related to this doc
      if (docName.includes('claude') && lowerFile.includes('claude')) return true;
      if (docName.includes('readme') && (lowerFile.includes('index') || lowerFile.includes('main'))) return true;
      return true; // Include all for now, could be smarter
    }).slice(0, 10); // Limit to 10 files

    for (const file of relatedFiles) {
      try {
        const fullPath = path.join(this.projectRoot, file);
        const stats = await fs.stat(fullPath);

        if (stats.isFile() && stats.size < maxSampleSize * 2) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const truncated = content.length > maxSampleSize
            ? content.slice(0, maxSampleSize) + '\n... [truncated]'
            : content;
          samples.push(`### ${file}\n${truncated}`);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return samples;
  }

  /**
   * Discover source files in the project
   */
  private async discoverSourceFiles(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.rs',
      '**/*.java'
    ];

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: DEFAULT_IGNORE,
        absolute: false
      });
      allFiles.push(...files);
    }

    return allFiles;
  }

  /**
   * Get all context files to check
   */
  private async getContextFiles(): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of DEFAULT_CONTEXT_FILES) {
      const matched = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: DEFAULT_IGNORE,
        absolute: false
      });
      files.push(...matched);
    }

    // Deduplicate
    return Array.from(new Set(files));
  }

  /**
   * Attempt to fix drift in a file
   */
  private async fixDrift(relativePath: string, drift: DriftIssue): Promise<boolean> {
    // For now, just log what would be fixed
    // Auto-fixing requires careful implementation to avoid breaking things
    console.log(`Would fix drift in ${relativePath}:`);
    console.log(`  ${drift.suggestion || 'No suggestion available'}`);
    return false; // Not implementing auto-fix yet
  }

  /**
   * Close the agent and clean up resources
   */
  close(): void {
    // OpenRouterClient has its own cache management
    // Nothing to clean up here for now
  }
}

/**
 * Create a drift agent
 */
export function createDriftAgent(config: Omit<DriftAgentConfig, 'projectRoot'>): DriftAgent {
  return new DriftAgent({
    ...config,
    projectRoot: process.cwd()
  });
}
