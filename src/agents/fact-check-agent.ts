/**
 * Fact-Checking Agent
 *
 * Validates documentation accuracy against the actual codebase.
 * Uses AI to identify outdated information, incorrect references,
 * and missing dependencies.
 *
 * @version 3.1.0
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { OpenRouterClient } from '../embeddings/openrouter.js';
import { getModelFor, MODEL_CONFIG } from '../config/models.js';
import { parseAIResponse } from '../utils/ai-parser.js';

/**
 * A fact-check result for a single claim
 */
export interface FactCheckClaim {
  /** The claim being checked */
  claim: string;
  /** Whether the claim is factual */
  factual: boolean;
  /** Correction if not factual */
  correction?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Line number where claim appears */
  line?: number;
}

/**
 * Result of fact-checking a file
 */
export interface FactCheckResult {
  /** The file that was checked */
  file: string;
  /** All claims checked */
  claims: FactCheckClaim[];
  /** Summary statistics */
  summary: {
    total: number;
    factual: number;
    notFactual: number;
    lowConfidence: number;
  };
}

/**
 * Configuration for the fact-check agent
 */
export interface FactCheckAgentConfig {
  /** OpenRouter client for AI analysis */
  openRouter: OpenRouterClient;
  /** Model override (not recommended) */
  model?: string;
  /** Project root directory */
  projectRoot: string;
}

/**
 * Fact-Checking Agent
 *
 * Analyzes documentation files to identify claims that may be:
 * - Outdated (referencing deprecated APIs, old versions)
 * - Inaccurate (wrong file paths, incorrect API signatures)
 * - Missing dependencies (referencing non-existent files)
 */
export class FactCheckAgent {
  private openRouter: OpenRouterClient;
  private model: string;
  private projectRoot: string;

  constructor(config: FactCheckAgentConfig) {
    this.openRouter = config.openRouter;
    this.model = config.model || getModelFor('FACT_CHECK');
    this.projectRoot = config.projectRoot;
  }

  /**
   * Fact-check a specific file
   */
  async factCheck(filePath: string): Promise<FactCheckResult> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.projectRoot, filePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');

      // Discover relevant source files for verification
      const sourceFiles = await this.discoverSourceFiles();

      // Use AI to fact-check the documentation
      const analysis = await this.openRouter.chat([
        {
          role: 'system',
          content: this.getFactCheckSystemPrompt()
        },
        {
          role: 'user',
          content: this.buildFactCheckPrompt(filePath, content, sourceFiles)
        }
      ], {
        model: this.model,
        temperature: MODEL_CONFIG.ANALYSIS_TEMPERATURE,
        maxTokens: MODEL_CONFIG.DRIFT_MAX_TOKENS
      });

      // Parse the response
      const claims = this.parseFactCheckResponse(analysis);

      const summary = {
        total: claims.length,
        factual: claims.filter(c => c.factual).length,
        notFactual: claims.filter(c => !c.factual).length,
        lowConfidence: claims.filter(c => c.confidence < 0.7).length
      };

      return {
        file: filePath,
        claims,
        summary
      };

    } catch (error) {
      throw new Error(`Failed to fact-check ${filePath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Fact-check multiple files
   */
  async factCheckMultiple(filePaths: string[]): Promise<FactCheckResult[]> {
    const results: FactCheckResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.factCheck(filePath);
        results.push(result);
      } catch (error) {
        console.error(`Error checking ${filePath}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Get the fact-check system prompt
   */
  private getFactCheckSystemPrompt(): string {
    return `You are a fact-checking expert for technical documentation.

Your task is to analyze the given documentation and identify claims that may be:
1. **Outdated** - Referencing deprecated APIs, old versions, removed features
2. **Inaccurate** - Wrong file paths, incorrect API signatures, wrong command syntax
3. **Missing dependencies** - Referencing non-existent files or packages

For each issue found, provide:
- The exact claim (excerpt from documentation)
- Whether it's factual (true) or not (false)
- A correction if not factual
- Confidence score (0.0-1.0)

Respond with valid JSON only:
{
  "claims": [
    {
      "claim": "exact text from documentation",
      "factual": boolean,
      "correction": "correction if not factual",
      "confidence": 0.0-1.0,
      "line": approximate_line_number
    }
  ]
}

Confidence guidelines:
- 1.0: Verified against provided source code
- 0.8-0.9: High confidence based on common patterns
- 0.5-0.7: Medium confidence, may need manual review
- <0.5: Low confidence, requires human verification`;
  }

  /**
   * Build the fact-check prompt for a specific file
   */
  private buildFactCheckPrompt(
    docPath: string,
    docContent: string,
    sourceFiles: string[]
  ): string {
    let prompt = `Check for factual accuracy in: ${docPath}\n\n`;
    prompt += `## Documentation Content\n${docContent}\n\n`;

    if (sourceFiles.length > 0) {
      prompt += `## Available Source Files (for verification)\n`;
      prompt += `Use these to verify file references and API signatures:\n\n`;
      for (const file of sourceFiles.slice(0, 20)) { // Limit to 20 files
        prompt += `- ${file}\n`;
      }
    }

    prompt += `\nAnalyze the documentation and identify any factual inaccuracies.`;

    return prompt;
  }

  /**
   * Parse the fact-check response
   */
  private parseFactCheckResponse(response: string): FactCheckClaim[] {
    interface RawClaim {
      claim?: string;
      factual?: boolean;
      correction?: string;
      confidence?: number;
      line?: number;
    }

    const parsed = parseAIResponse<{ claims: RawClaim[] }>(response);

    if (parsed && parsed.claims && Array.isArray(parsed.claims)) {
      return parsed.claims.map((c) => ({
        claim: String(c.claim || ''),
        factual: Boolean(c.factual),
        correction: c.correction ? String(c.correction) : undefined,
        confidence: Number(c.confidence || 0.5),
        line: c.line ? Number(c.line) : undefined
      }));
    }

    return [];
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
      '**/*.json',
      '**/*.yaml',
      '**/*.yml'
    ];

    const allFiles: string[] = [];
    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/*.min.js'
    ];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          ignore,
          absolute: false
        });
        allFiles.push(...files);
      } catch {
        // Ignore glob errors
      }
    }

    return allFiles;
  }

  /**
   * Get all documentation files to check
   */
  async getDocumentationFiles(): Promise<string[]> {
    const patterns = [
      '**/*.md',
      '**/*.mdx',
      'CLAUDE.md',
      'README.md',
      '.cursorrules',
      '.clinerules'
    ];

    const files: string[] = [];
    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ];

    for (const pattern of patterns) {
      try {
        const matched = await glob(pattern, {
          cwd: this.projectRoot,
          ignore,
          absolute: false
        });
        files.push(...matched);
      } catch {
        // Ignore glob errors
      }
    }

    // Deduplicate
    return Array.from(new Set(files));
  }

  /**
   * Close the agent and clean up resources
   */
  close(): void {
    // OpenRouterClient has its own cache management
  }
}

/**
 * Create a fact-check agent
 */
export function createFactCheckAgent(config: Omit<FactCheckAgentConfig, 'projectRoot'>): FactCheckAgent {
  return new FactCheckAgent({
    ...config,
    projectRoot: process.cwd()
  });
}
