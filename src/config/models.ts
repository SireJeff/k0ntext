/**
 * Centralized Model Configuration
 *
 * k0ntext enforces strict model usage for all AI operations.
 * This ensures consistent behavior, cost control, and quality.
 *
 * @version 3.1.0
 */

/**
 * Model identifiers for different AI operations
 *
 * All intelligent operations use google/gemini-3-flash-preview for:
 * - Fast response times
 * - Cost-effectiveness
 * - Excellent analysis capabilities
 * - Large context window
 */
export const K0NTEXT_MODELS = {
  /** Primary model for all intelligent operations (drift detection, workflow discovery, smart merge, cleanup, fact check) */
  DRIFT_DETECTION: 'google/gemini-3-flash-preview',
  WORKFLOW_DISCOVERY: 'google/gemini-3-flash-preview',
  SMART_MERGE: 'google/gemini-3-flash-preview',
  CLEANUP: 'google/gemini-3-flash-preview',
  FACT_CHECK: 'google/gemini-3-flash-preview',

  /** Model for semantic embeddings (high-quality, small dimension) */
  EMBEDDING: 'openai/text-embedding-3-small',
} as const;

/**
 * Type of model operation
 */
export type ModelType = keyof typeof K0NTEXT_MODELS;

/**
 * Legacy model name for backward compatibility
 * @deprecated Use K0NTEXT_MODELS.DRIFT_DETECTION instead
 */
export const DEFAULT_CHAT_MODEL = K0NTEXT_MODELS.DRIFT_DETECTION;

/**
 * Legacy embedding model for backward compatibility
 * @deprecated Use K0NTEXT_MODELS.EMBEDDING instead
 */
export const DEFAULT_EMBEDDING_MODEL = K0NTEXT_MODELS.EMBEDDING;

/**
 * Get model for a specific operation
 *
 * @param operation - The type of operation
 * @returns The model identifier for that operation
 */
export function getModelFor(operation: ModelType): string {
  return K0NTEXT_MODELS[operation];
}

/**
 * Validate that a model name is allowed
 *
 * @param model - The model name to validate
 * @returns True if the model is in the allowed list
 */
export function isValidModel(model: string): boolean {
  return Object.values(K0NTEXT_MODELS).includes(model as any);
}

/**
 * Get all allowed model identifiers
 *
 * @returns Array of all allowed model names
 */
export function getAllowedModels(): readonly string[] {
  return Object.values(K0NTEXT_MODELS);
}

/**
 * Configuration for model behavior
 */
export const MODEL_CONFIG = {
  /** Maximum tokens for drift detection analysis */
  DRIFT_MAX_TOKENS: 8192,
  /** Maximum tokens for workflow discovery */
  WORKFLOW_MAX_TOKENS: 4096,
  /** Maximum tokens for smart merge operations */
  MERGE_MAX_TOKENS: 6144,
  /** Temperature for analysis tasks (lower = more deterministic) */
  ANALYSIS_TEMPERATURE: 0.2,
  /** Temperature for creative tasks */
  CREATIVE_TEMPERATURE: 0.7,
  /** Maximum retry count for API calls */
  MAX_RETRIES: 3,
  /** Base retry delay in milliseconds */
  BASE_RETRY_DELAY: 1000,
  /** Embedding dimension for text-embedding-3-small */
  EMBEDDING_DIMENSION: 1536,
  /** Minimum request interval for rate limiting (ms) */
  MIN_REQUEST_INTERVAL: 100,
  /** Request timeout (ms) */
  REQUEST_TIMEOUT: 30000,
} as const;

/**
 * Model category for grouping similar operations
 */
export type ModelCategory = 'chat' | 'embedding';

/**
 * Get the category of a model operation
 *
 * @param operation - The type of operation
 * @returns The model category ('chat' or 'embedding')
 */
export function getModelCategory(operation: ModelType): ModelCategory {
  return operation === 'EMBEDDING' ? 'embedding' : 'chat';
}

/**
 * Get the primary chat model for intelligent operations
 *
 * This is the default model used for most AI-powered features.
 *
 * @returns The primary chat model identifier
 */
export function getPrimaryChatModel(): string {
  return K0NTEXT_MODELS.DRIFT_DETECTION;
}

/**
 * Get the embedding model
 *
 * @returns The embedding model identifier
 */
export function getEmbeddingModel(): string {
  return K0NTEXT_MODELS.EMBEDDING;
}
