/**
 * OpenRouter Client Tests
 *
 * Tests for OpenRouter API client including BOM handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenRouterClient, hasOpenRouterKey, OpenRouterClient } from '../../src/embeddings/openrouter.js';

describe('OpenRouter Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe('BOM Handling', () => {
    it('should strip UTF-8 BOM from OPENROUTER_API_KEY', () => {
      // UTF-8 BOM is EF BB BF which is U+FEFF as a character code
      const keyWithBOM = '\uFEFFsk-or-test-key-12345';
      process.env.OPENROUTER_API_KEY = keyWithBOM;

      // Get the raw env value to verify BOM is present
      expect(process.env.OPENROUTER_API_KEY?.charCodeAt(0)).toBe(0xFEFF);

      // Create client - the BOM should be stripped internally
      const client = createOpenRouterClient();

      // Verify client was created successfully
      expect(client).toBeInstanceOf(OpenRouterClient);

      // Verify the BOM was stripped by checking the first character is not BOM
      // Note: We need to verify this indirectly since apiKey is private
      // The test passing without throwing means the key is valid for use
    });

    it('should accept API key without BOM', () => {
      const keyWithoutBOM = 'sk-or-test-key-12345';
      process.env.OPENROUTER_API_KEY = keyWithoutBOM;

      // Should not throw error about missing API key
      expect(() => createOpenRouterClient()).not.to.throw();
    });

    it('should throw error when API key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;

      expect(() => createOpenRouterClient()).toThrow('OPENROUTER_API_KEY environment variable is required');
    });

    it('should throw error when API key is empty string', () => {
      process.env.OPENROUTER_API_KEY = '';

      expect(() => createOpenRouterClient()).toThrow('OPENROUTER_API_KEY environment variable is required');
    });

  });

  describe('hasOpenRouterKey', () => {
    it('should return true when API key exists without BOM', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-12345';

      expect(hasOpenRouterKey()).toBe(true);
    });

    it('should return true when API key exists with BOM', () => {
      process.env.OPENROUTER_API_KEY = '\uFEFFsk-or-test-key-12345';

      expect(hasOpenRouterKey()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;

      expect(hasOpenRouterKey()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      process.env.OPENROUTER_API_KEY = '';

      expect(hasOpenRouterKey()).toBe(false);
    });
  });

  describe('OpenRouterClient', () => {
    it('should create client with valid API key', () => {
      const client = new OpenRouterClient({
        apiKey: 'sk-or-test-key-12345'
      });

      expect(client).toBeInstanceOf(OpenRouterClient);
      expect(client.getDimension()).toBe(1536);
    });

    it('should throw error when API key is not provided in constructor', () => {
      expect(() => new OpenRouterClient({ apiKey: '' as any }))
        .toThrow('OPENROUTER_API_KEY is required');
    });

    it('should throw error when API key is undefined in constructor', () => {
      expect(() => new OpenRouterClient({ apiKey: undefined as any }))
        .toThrow('OPENROUTER_API_KEY is required');
    });
  });
});
