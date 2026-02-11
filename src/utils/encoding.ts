/**
 * Encoding Utilities
 *
 * Handles text encoding issues across different platforms.
 */

/**
 * Strip UTF-8 BOM (Byte Order Mark) from a string.
 *
 * The UTF-8 BOM is the byte sequence EF BB BF (U+FEFF).
 * Some Windows editors add this to the start of files,
 * which can break environment variable parsing.
 *
 * @param str - String that may contain a BOM
 * @returns String with BOM removed if present
 */
export function stripBOM(str: string): string {
  // Check for BOM at position 0
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

/**
 * Detect if a string has a UTF-8 BOM.
 *
 * @param str - String to check
 * @returns true if BOM is present
 */
export function hasBOM(str: string): boolean {
  return str.charCodeAt(0) === 0xFEFF;
}
