/**
 * Encoding Utility Tests
 *
 * Tests for UTF-8 BOM handling and other encoding utilities.
 */

import { describe, it, expect } from 'vitest';
import { stripBOM, hasBOM } from '../../src/utils/encoding.js';

describe('Encoding Utilities', () => {
  const BOM = '\uFEFF';
  const SAMPLE_TEXT = 'Hello, world!';
  const TEXT_WITH_BOM = BOM + SAMPLE_TEXT;

  describe('stripBOM', () => {
    it('should remove BOM from the start of a string', () => {
      expect(stripBOM(TEXT_WITH_BOM)).toBe(SAMPLE_TEXT);
    });

    it('should return the original string if no BOM is present', () => {
      expect(stripBOM(SAMPLE_TEXT)).toBe(SAMPLE_TEXT);
    });

    it('should handle empty strings', () => {
      expect(stripBOM('')).toBe('');
    });

    it('should not remove BOM if it is not at the start', () => {
      const textWithMidBOM = 'Hello' + BOM + 'world';
      expect(stripBOM(textWithMidBOM)).toBe(textWithMidBOM);
    });

    it('should only remove one BOM from the start', () => {
      const doubleBOM = BOM + BOM + SAMPLE_TEXT;
      expect(stripBOM(doubleBOM)).toBe(BOM + SAMPLE_TEXT);
    });
  });

  describe('hasBOM', () => {
    it('should return true if BOM is present at the start', () => {
      expect(hasBOM(TEXT_WITH_BOM)).toBe(true);
    });

    it('should return false if no BOM is present', () => {
      expect(hasBOM(SAMPLE_TEXT)).toBe(false);
    });

    it('should return false if BOM is not at the start', () => {
      expect(hasBOM('Hello' + BOM)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasBOM('')).toBe(false);
    });
  });
});
