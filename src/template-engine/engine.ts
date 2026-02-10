/**
 * Template Engine
 *
 * Handlebars-based template engine for rich context generation.
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerHelpers } from './helpers.js';
import { buildTemplateData } from './data-transformer.js';
import type { TemplateData, TemplateRenderOptions, TemplateRenderResult } from './types.js';
import type { DatabaseClient } from '../db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template engine class
 *
 * Manages Handlebars templates and rendering.
 */
export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private partialsCache: Set<string> = new Set();
  private templatesDir: string;
  private k0ntextVersion: string;

  constructor(k0ntextVersion: string) {
    this.handlebars = Handlebars.create();
    this.k0ntextVersion = k0ntextVersion;
    this.templatesDir = path.join(__dirname, '../../templates/handlebars');

    // Register custom helpers
    registerHelpers(this.handlebars);
  }

  /**
   * Render a template with data
   *
   * @param options - Template render options
   * @param db - Database client
   * @param projectRoot - Project root directory
   * @returns Rendered content
   */
  async render(
    options: TemplateRenderOptions,
    db: DatabaseClient,
    projectRoot: string
  ): Promise<TemplateRenderResult> {
    // Build template data from database
    let templateData = await buildTemplateData(db, projectRoot, this.k0ntextVersion);

    // Merge custom data if provided
    if (options.customData) {
      templateData = this.mergeData(templateData, options.customData);
    }

    // Load template
    const template = await this.loadTemplate(options.template, options.usePartials !== false);

    // Render template
    const content = template(templateData);

    return {
      content,
      template: options.template,
      bytes: Buffer.byteLength(content, 'utf-8')
    };
  }

  /**
   * Load a template by name
   *
   * @param templateName - Name of the template (e.g., 'claude', 'copilot')
   * @param loadPartials - Whether to load partials
   * @returns Compiled template
   */
  private async loadTemplate(
    templateName: string,
    loadPartials = true
  ): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load partials if needed
    if (loadPartials && this.partialsCache.size === 0) {
      await this.loadPartials();
    }

    // Read template file
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = this.handlebars.compile(templateContent);

      // Cache compiled template
      this.templateCache.set(templateName, template);

      return template;
    } catch (error) {
      throw new Error(`Failed to load template '${templateName}': ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Load all partials from the partials directory
   */
  private async loadPartials(): Promise<void> {
    const partialsDir = path.join(this.templatesDir, 'partials');

    try {
      await fs.access(partialsDir);
    } catch {
      // Partials directory doesn't exist
      return;
    }

    const entries = await fs.readdir(partialsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.hbs')) continue;

      const partialName = entry.replace('.hbs', '');
      const partialPath = path.join(partialsDir, entry);

      try {
        const partialContent = await fs.readFile(partialPath, 'utf-8');
        this.handlebars.registerPartial(partialName, partialContent);
        this.partialsCache.add(partialName);
      } catch (error) {
        console.warn(`Warning: Failed to load partial '${partialName}':`, error);
      }
    }
  }

  /**
   * Merge custom data into template data
   *
   * @param base - Base template data
   * @param custom - Custom data to merge
   * @returns Merged data
   */
  private mergeData(base: TemplateData, custom: Partial<TemplateData>): TemplateData {
    return {
      project: { ...base.project, ...custom.project },
      architecture: { ...base.architecture, ...custom.architecture },
      key_files: { ...base.key_files, ...custom.key_files },
      commands: { ...base.commands, ...custom.commands },
      workflows: custom.workflows || base.workflows,
      gotchas: custom.gotchas || base.gotchas,
      critical_constraints: custom.critical_constraints || base.critical_constraints,
      environment: custom.environment ? { ...base.environment, ...custom.environment } : base.environment,
      metadata: { ...base.metadata, ...custom.metadata },
      coordination: custom.coordination ? { ...base.coordination, ...custom.coordination } : base.coordination
    };
  }

  /**
   * Check if a template exists
   *
   * @param templateName - Name of the template
   * @returns True if template file exists
   */
  async hasTemplate(templateName: string): Promise<boolean> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available templates
   *
   * @returns Array of template names
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.templatesDir);
      return entries
        .filter(e => e.endsWith('.hbs') && !e.startsWith('.'))
        .map(e => e.replace('.hbs', ''));
    } catch {
      return [];
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

/**
 * Create a template engine instance
 *
 * @param k0ntextVersion - Current k0ntext version
 * @returns Template engine instance
 */
export function createTemplateEngine(k0ntextVersion: string): TemplateEngine {
  return new TemplateEngine(k0ntextVersion);
}
