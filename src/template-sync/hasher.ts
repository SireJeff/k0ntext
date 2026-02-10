/**
 * Template Hasher
 *
 * Hash generation utilities for template files.
 * Uses SHA-256 with 16-character slice for consistency with DatabaseClient.
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';

/**
 * Template hasher - generates content hashes
 *
 * Uses the same hashing algorithm as DatabaseClient.hashContent() for consistency:
 * - SHA-256 hash
 * - Sliced to 16 characters
 */
export class TemplateHasher {
  /**
   * Hash file content using SHA256 (16 char slice for consistency)
   *
   * @param content - File content to hash
   * @returns 16-character hash string
   */
  static hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
  }

  /**
   * Hash a file by reading its content
   *
   * @param filePath - Absolute path to the file
   * @returns 16-character hash string
   * @throws Error if file cannot be read
   */
  static async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf8');
    return this.hashContent(content);
  }

  /**
   * Hash a file by path with error handling
   *
   * @param filePath - Absolute path to the file
   * @returns 16-character hash string, or empty string if file doesn't exist
   */
  static async hashFileSafe(filePath: string): Promise<string> {
    try {
      return await this.hashFile(filePath);
    } catch {
      return '';
    }
  }

  /**
   * Compare two hashes for equality
   *
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns true if hashes are identical
   */
  static compare(hash1: string, hash2: string): boolean {
    return hash1 === hash2;
  }

  /**
   * Check if a hash is valid (non-empty, 16 characters, hexadecimal)
   *
   * @param hash - Hash string to validate
   * @returns true if hash is valid
   */
  static isValidHash(hash: string): boolean {
    return /^[a-f0-9]{16}$/.test(hash);
  }

  /**
   * Hash multiple files in parallel
   *
   * @param filePaths - Array of absolute file paths
   * @returns Map of file path to hash
   */
  static async hashFiles(filePaths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        const hash = await this.hashFileSafe(filePath);
        results.set(filePath, hash);
      })
    );

    return results;
  }

  /**
   * Generate a hash from a buffer
   *
   * @param buffer - Buffer to hash
   * @returns 16-character hash string
   */
  static hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  }
}
