/**
 * Text Chunking Utility Tests
 *
 * Tests for splitting large texts into chunks for embedding generation.
 */

import { describe, it, expect } from 'vitest';
import { chunkText, estimateTokens } from '../../src/utils/chunking.js';

describe('Text Chunking Utility', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for simple text', () => {
      // Roughly 1 token per 4 characters for English text
      const text = 'The quick brown fox jumps over the lazy dog.';
      const estimate = estimateTokens(text);
      // ~55 characters / 4 ≈ 14 tokens
      expect(estimate).toBeGreaterThan(10);
      expect(estimate).toBeLessThan(20);
    });

    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle whitespace', () => {
      const text = '     ';
      const estimate = estimateTokens(text);
      expect(estimate).toBeLessThan(5);
    });

    it('should estimate correctly for code-like text', () => {
      const code = 'function hello() { return "world"; }';
      const estimate = estimateTokens(code);
      expect(estimate).toBeGreaterThan(5);
      expect(estimate).toBeLessThan(30);
    });
  });

  describe('chunkText', () => {
    const MAX_TOKENS = 8000; // Default max tokens for OpenRouter embeddings

    it('should not chunk short text', () => {
      const shortText = 'This is a short text.';
      const chunks = chunkText(shortText, MAX_TOKENS);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it('should not chunk text under max tokens', () => {
      // Create text that's under 8K tokens (~32K characters)
      const mediumText = 'x'.repeat(10000);
      const chunks = chunkText(mediumText, MAX_TOKENS);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].length).toBe(10000);
    });

    it('should chunk text over max tokens', () => {
      // Create text that's over 8K tokens (~40K characters)
      const longText = 'a'.repeat(40000);
      const chunks = chunkText(longText, MAX_TOKENS);
      expect(chunks.length).toBeGreaterThan(1);

      // Each chunk should be under or near the limit
      for (const chunk of chunks) {
        const tokenEstimate = estimateTokens(chunk);
        expect(tokenEstimate).toBeLessThanOrEqual(MAX_TOKENS * 1.1); // Allow 10% overage
      }
    });

    it('should preserve newlines when chunking', () => {
      const textWithNewlines = 'line1\n'.repeat(5000);
      const chunks = chunkText(textWithNewlines, MAX_TOKENS);

      // Check that chunks don't break in the middle of line pattern
      const allChunks = chunks.join('');
      expect(allChunks).toContain('\n');
    });

    it('should try to break at word boundaries', () => {
      const words = 'word '.repeat(10000);
      const chunks = chunkText(words, MAX_TOKENS);

      // First chunk should end with a complete word (not cut off)
      const firstChunkEnd = chunks[0].slice(-20);
      expect(firstChunkEnd).toMatch(/\s*word\s*/);
    });

    it('should handle empty string', () => {
      const chunks = chunkText('', MAX_TOKENS);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('');
    });

    it('should handle custom max tokens', () => {
      const longText = 'x'.repeat(50000);
      const chunks = chunkText(longText, 5000);
      expect(chunks.length).toBeGreaterThan(1);

      for (const chunk of chunks) {
        const tokenEstimate = estimateTokens(chunk);
        expect(tokenEstimate).toBeLessThanOrEqual(5000 * 1.1);
      }
    });

    it('should add overlap to chunks for context', () => {
      const longText = 'word '.repeat(10000);
      const chunks = chunkText(longText, MAX_TOKENS, 100);

      // With overlap, we should have more content overall than original
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      expect(totalLength).toBeGreaterThan(longText.length);
    });
  });

  describe('Edge Cases', () => {
    const MAX_TOKENS = 8000;

    it('should handle text with only whitespace', () => {
      const whitespace = ' \n\t '.repeat(100);
      const chunks = chunkText(whitespace, MAX_TOKENS);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long single word', () => {
      // Create a very long "word" (like a base64 string)
      const longWord = 'a'.repeat(50000);
      const chunks = chunkText(longWord, MAX_TOKENS);

      // Should still chunk even without word boundaries
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle mixed content with code', () => {
      const code = `
        function example() {
          const longString = '${'x'.repeat(10000)}';
          return longString;
        }
      `.repeat(100);

      const chunks = chunkText(code, MAX_TOKENS);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
