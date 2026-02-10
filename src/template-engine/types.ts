/**
 * Template Engine Types
 *
 * Type definitions for template data and rendering.
 */

/**
 * Project metadata for templates
 */
export interface ProjectTemplateData {
  name: string;
  description?: string;
  type?: string;
  tech_stack: string[];
  primary_language?: string;
  version?: string;
}

/**
 * Architecture information
 */
export interface ArchitectureTemplateData {
  pattern?: string;
  layers?: LayerInfo[];
  key_modules?: string[];
  integrations?: string[];
}

/**
 * Layer information
 */
export interface LayerInfo {
  name: string;
  path: string;
  purpose?: string;
}

/**
 * Key files information
 */
export interface KeyFilesTemplateData {
  entry_points?: string[];
  api_routes?: string[];
  config?: string[];
  tests?: string[];
}

/**
 * Commands information
 */
export interface CommandsTemplateData {
  install?: string;
  dev?: string;
  test?: string;
  build?: string;
  lint?: string;
  clean?: string;
  [key: string]: string | undefined;
}

/**
 * Workflow information for templates
 */
export interface WorkflowTemplateData {
  name: string;
  category?: string;
  complexity?: string;
  description?: string;
  entry_points?: Array<{
    endpoint: string;
    file: string;
    line?: number;
    method?: string;
  }>;
  files?: string[];
  steps?: string[];
}

/**
 * Gotcha information
 */
export interface GotchaTemplateData {
  title?: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
}

/**
 * Environment variables information
 */
export interface EnvironmentTemplateData {
  required?: string[];
  optional?: string[];
}

/**
 * Coordination/footer information
 */
export interface CoordinationTemplateData {
  footer?: string;
  version?: string;
  timestamp?: string;
}

/**
 * Complete template data model
 */
export interface TemplateData {
  /** Project metadata */
  project: ProjectTemplateData;
  /** Architecture information */
  architecture: ArchitectureTemplateData;
  /** Key files */
  key_files: KeyFilesTemplateData;
  /** Development commands */
  commands: CommandsTemplateData;
  /** Workflows */
  workflows: WorkflowTemplateData[];
  /** Gotchas / critical gotchas */
  gotchas?: GotchaTemplateData[];
  /** Critical constraints */
  critical_constraints?: string[];
  /** Environment variables */
  environment?: EnvironmentTemplateData;
  /** Metadata */
  metadata: {
    generator_version: string;
    timestamp: string;
    header?: string;
  };
  /** Coordination/footer */
  coordination?: CoordinationTemplateData;
}

/**
 * Template rendering options
 */
export interface TemplateRenderOptions {
  /** Template name (e.g., 'claude', 'copilot') */
  template: string;
  /** Whether to use partials */
  usePartials?: boolean;
  /** Custom data to merge */
  customData?: Partial<TemplateData>;
}

/**
 * Template render result
 */
export interface TemplateRenderResult {
  /** Rendered content */
  content: string;
  /** Template used */
  template: string;
  /** Bytes written */
  bytes: number;
}
